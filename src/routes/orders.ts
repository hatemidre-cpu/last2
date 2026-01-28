import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { authMiddleware, requirePermission, AuthRequest } from '../middleware/auth.js';
import { createActivityLog } from '../services/activity.js';

const router = Router();
const prisma = new PrismaClient();

// Create order (protected)
router.post(
    '/',
    authMiddleware,
    [
        body('items').isArray().withMessage('Items must be an array'),
        body('total').isFloat({ min: 0 }).withMessage('Total must be a positive number'),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { items, total, useWalletBalance, shippingInfo } = req.body;
            const userId = req.userId!;

            // Get user's current balance
            const user = await prisma.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            // Only check and deduct balance if user wants to use wallet
            if (useWalletBalance) {
                // Check if user has sufficient balance
                if (user.balance < total) {
                    res.status(400).json({ error: 'Insufficient balance' });
                    return;
                }

                // Create order and update balance in a transaction
                const [order] = await prisma.$transaction([
                    prisma.order.create({
                        data: {
                            userId,
                            items: JSON.stringify(items),
                            total,
                            status: 'pending',
                            shippingInfo: shippingInfo ? JSON.stringify(shippingInfo) : null
                        },
                    }),
                    prisma.user.update({
                        where: { id: userId },
                        data: { balance: user.balance - total },
                    }),
                    prisma.transaction.create({
                        data: {
                            userId,
                            type: 'purchase',
                            amount: -total,
                            description: `Purchase order (paid with wallet)`,
                        },
                    }),
                ]);

                res.status(201).json({ order });
            } else {
                // Cash on Delivery - just create the order without deducting balance
                const order = await prisma.order.create({
                    data: {
                        userId,
                        items: JSON.stringify(items),
                        total,
                        status: 'pending',
                        shippingInfo: shippingInfo ? JSON.stringify(shippingInfo) : null
                    },
                });

                res.status(201).json({ order });
            }
        } catch (error) {
            console.error('Create order error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// Get user's orders (protected)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId!;

        const orders = await prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        // Parse items JSON for each order
        const ordersWithParsedItems = orders.map(order => ({
            ...order,
            items: JSON.parse(order.items),
        }));

        res.json({ orders: ordersWithParsedItems });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single order (protected)
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.userId!;

        const order = await prisma.order.findFirst({
            where: { id, userId },
        });

        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        res.json({
            order: {
                ...order,
                items: JSON.parse(order.items),
            }
        });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin: Get all orders
router.get('/admin/all', authMiddleware, requirePermission('read:orders'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const orders = await prisma.order.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const ordersWithParsedItems = orders.map(order => ({
            ...order,
            items: JSON.parse(order.items)
        }));

        res.json({ orders: ordersWithParsedItems });
    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin: Update order status
router.put('/admin/:id/status', authMiddleware, requirePermission('write:orders'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const order = await prisma.order.update({
            where: { id },
            data: { status }
        });

        await createActivityLog({
            type: 'order',
            action: 'updated',
            description: `Updated order status to ${status}: ${id}`,
            userId: req.userId,
            metadata: { orderId: id, status }
        });

        res.json({ order });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
