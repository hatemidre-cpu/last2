import { PrismaClient } from '@prisma/client';
import { notifyAdmins } from './socketService.js';

const prisma = new PrismaClient();

export class InventoryService {
    /**
     * Check for low stock items and return them
     */
    async getLowStockItems() {
        // Get global threshold setting or default to 5
        const settings = await prisma.settings.findUnique({
            where: { key: 'low_stock_threshold' }
        });

        const globalThreshold = settings?.value ? Number(settings.value) : 5;

        // Find products where stock is below their specific threshold or the global threshold
        const products = await prisma.product.findMany({
            where: {
                inStock: true,
                OR: [
                    {
                        stock: {
                            lte: globalThreshold
                        },
                        lowStockThreshold: {
                            equals: 0 // If 0, use global (logic handled below/in query structure)
                        }
                    },
                    {
                        // If product has specific threshold
                        stock: {
                            lte: prisma.product.fields.lowStockThreshold
                        },
                        lowStockThreshold: {
                            gt: 0
                        }
                    }
                ]
            },
            select: {
                id: true,
                name: true,
                stock: true,
                lowStockThreshold: true,
                image: true
            }
        });

        // Filter again to be safe and apply logic precisely
        return products.filter(p => {
            const threshold = p.lowStockThreshold > 0 ? p.lowStockThreshold : globalThreshold;
            return p.stock <= threshold;
        });
    }

    /**
     * Update stock for a product and trigger alert if low
     */
    async updateStock(productId: string, quantityChange: number) {
        const product = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) throw new Error('Product not found');

        const newStock = Math.max(0, product.stock + quantityChange);

        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: {
                stock: newStock,
                inStock: newStock > 0
            }
        });

        // Check if we need to alert
        await this.checkAndAlert(updatedProduct);

        return updatedProduct;
    }

    /**
     * Check single product and send alert if needed
     */
    async checkAndAlert(product: any) {
        const settings = await prisma.settings.findUnique({
            where: { key: 'low_stock_threshold' }
        });
        const globalThreshold = settings?.value ? Number(settings.value) : 5;
        const threshold = product.lowStockThreshold > 0 ? product.lowStockThreshold : globalThreshold;

        if (product.stock <= threshold) {
            // Send notification via socket
            notifyAdmins('notification', {
                type: 'warning',
                title: 'Low Stock Alert',
                message: `${product.name} is running low on stock (${product.stock} remaining).`,
                timestamp: new Date()
            });

            // Persist notification
            await prisma.notification.create({
                data: {
                    type: 'warning',
                    title: 'Low Stock Alert',
                    message: `${product.name} is running low on stock (${product.stock} remaining).`,
                    actionUrl: `/admin/products?id=${product.id}`
                }
            });
        }
    }

    /**
     * Predict inventory depletion based on sales history
     */
    async getInventoryPredictions(daysOfHistory = 30) {
        // 1. Get all products with stock > 0
        const products = await prisma.product.findMany({
            where: { inStock: true },
            select: { id: true, name: true, stock: true, image: true }
        });

        // 2. Get sales velocity using optimized raw query (Postgres specific)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysOfHistory);

        let salesMap = new Map<string, number>();

        try {
            const salesData: any[] = await prisma.$queryRaw`
                SELECT
                    elem->>'id' as "productId",
                    SUM(CAST(elem->>'quantity' AS INTEGER)) as "totalSold"
                FROM "Order",
                     jsonb_array_elements(items::jsonb) as elem
                WHERE "createdAt" >= ${startDate}
                  AND status = 'completed'
                GROUP BY "productId"
            `;

            salesData.forEach(item => {
                salesMap.set(item.productId, Number(item.totalSold));
            });
        } catch (error) {
            console.error('Error calculating sales velocity:', error);
            // Fallback or empty map if query fails
        }

        // 3. Generate predictions
        const predictions = products.map(product => {
            const totalSold = salesMap.get(product.id) || 0;
            const dailyVelocity = totalSold / daysOfHistory;

            let daysRemaining = 999;
            if (dailyVelocity > 0) {
                daysRemaining = Math.round(product.stock / dailyVelocity);
            }

            let riskLevel = 'low';
            if (daysRemaining <= 7) riskLevel = 'critical';
            else if (daysRemaining <= 14) riskLevel = 'high';
            else if (daysRemaining <= 30) riskLevel = 'medium';

            return {
                ...product,
                totalSold,
                dailyVelocity: Number(dailyVelocity.toFixed(2)),
                daysRemaining,
                riskLevel
            };
        });

        // Return only items with some sales activity or low stock
        return predictions
            .filter(p => p.totalSold > 0 || p.stock < 10)
            .sort((a, b) => a.daysRemaining - b.daysRemaining);
    }
    /**
     * Identify dead stock (products with stock > 0 but no sales in X days)
     */
    async getDeadStock(daysThreshold = 90) {
        // 1. Get all products with stock > 0
        const products = await prisma.product.findMany({
            where: { inStock: true, stock: { gt: 0 } },
            select: { id: true, name: true, stock: true, price: true, image: true } // lastSoldAt doesn't exist, we calculate it
        });

        // 2. Get sales in the last X days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysThreshold);

        let activeProductIds = new Set<string>();

        try {
            const salesData: any[] = await prisma.$queryRaw`
                SELECT DISTINCT elem->>'id' as "productId"
                FROM "Order",
                     jsonb_array_elements(items::jsonb) as elem
                WHERE "createdAt" >= ${startDate}
                  AND status != 'cancelled'
            `;

            salesData.forEach(item => {
                activeProductIds.add(item.productId);
            });
        } catch (error) {
            console.error('Error calculating dead stock:', error);
        }

        // 3. Filter products that are NOT in the active set
        const deadStock = products.filter(p => !activeProductIds.has(p.id));

        return deadStock.map(p => ({
            ...p,
            value: p.stock * p.price,
            daysInactive: daysThreshold // At least this many days
        }));
    }

    /**
     * Calculate total inventory valuation
     */
    async getInventoryValuation() {
        const products = await prisma.product.findMany({
            where: { inStock: true, stock: { gt: 0 } },
            select: { stock: true, price: true }
        });

        const totalValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
        const totalItems = products.reduce((sum, p) => sum + p.stock, 0);

        return {
            totalValue,
            totalItems,
            skuCount: products.length
        };
    }
}

export const inventoryService = new InventoryService();
