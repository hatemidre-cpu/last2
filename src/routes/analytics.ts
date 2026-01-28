import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requirePermission, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Track custom event
router.post('/event', async (req: Request, res: Response): Promise<void> => {
    try {
        const { event, metadata, path, deviceType, browser, os, screenResolution, language, referrer, location } = req.body;
        const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        let userId: string | null = null;

        // Try to get userId if authenticated (optional)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                const jwt = await import('jsonwebtoken');
                if (process.env.JWT_SECRET) {
                    const decoded = jwt.default.verify(token, process.env.JWT_SECRET) as { userId: string };
                    userId = decoded.userId;
                }
            } catch (e) {
                // Ignore
            }
        }

        await prisma.analyticsLog.create({
            data: {
                ipAddress,
                userAgent,
                path: path || 'unknown',
                method: 'POST',
                event: event || 'custom_event',
                userId,
                metadata: metadata ? JSON.stringify(metadata) : null,
                deviceType,
                browser,
                os,
                screenResolution,
                language,
                referrer,
                location: location ? location : undefined // Prisma handles Json type
            }
        });

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Analytics event error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get analytics (Admin only)
router.get('/stats', authMiddleware, requirePermission('read:analytics'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // 1. Overview Stats
        const totalRequests = await prisma.analyticsLog.count();
        const uniqueVisitors = await prisma.analyticsLog.groupBy({
            by: ['ipAddress'],
            _count: true
        });

        // Calculate average session duration from 'page_leave' events
        const pageLeaveEvents = await prisma.analyticsLog.findMany({
            where: { event: 'page_leave' },
            select: { metadata: true }
        });

        let totalDuration = 0;
        let durationCount = 0;

        pageLeaveEvents.forEach(log => {
            if (log.metadata) {
                try {
                    const meta = JSON.parse(log.metadata);
                    if (meta.duration_ms) {
                        totalDuration += meta.duration_ms;
                        durationCount++;
                    }
                } catch (e) { }
            }
        });

        const avgSessionDuration = durationCount > 0 ? Math.round(totalDuration / durationCount / 1000) : 0;

        // 2. Top Pages (Page Views)
        const topPages = await prisma.analyticsLog.groupBy({
            by: ['path'],
            where: { event: 'page_view' },
            _count: { path: true },
            orderBy: { _count: { path: 'desc' } },
            take: 10
        });

        // 3. Traffic Over Time (Last 24h) - Group by Hour
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const last24hLogs = await prisma.analyticsLog.findMany({
            where: { createdAt: { gte: oneDayAgo } },
            select: { createdAt: true }
        });

        const trafficMap = new Map<string, number>();
        last24hLogs.forEach(log => {
            const hour = new Date(log.createdAt).getHours() + ':00';
            trafficMap.set(hour, (trafficMap.get(hour) || 0) + 1);
        });

        const traffic = Array.from(trafficMap.entries()).map(([date, count]) => ({ date, count }));

        // 4. Active Users (Last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const activeLogs = await prisma.analyticsLog.findMany({
            where: { createdAt: { gte: fiveMinutesAgo } },
            orderBy: { createdAt: 'desc' }
        });

        const activeVisitors = new Set();
        let usersInCheckout = 0;
        const visitorLastPath = new Map<string, string>();

        activeLogs.forEach(log => {
            if (!activeVisitors.has(log.ipAddress)) {
                activeVisitors.add(log.ipAddress);
                // The first log we encounter for an IP is the most recent one
                if (log.path) {
                    visitorLastPath.set(log.ipAddress, log.path);
                    if (log.path === '/checkout') {
                        usersInCheckout++;
                    }
                }
            }
        });

        // 5. Top Exit Pages
        // We look at 'website_exit' events
        const exitLogs = await prisma.analyticsLog.findMany({
            where: { event: 'website_exit' },
            select: { metadata: true }
        });

        const exitPagesMap = new Map<string, number>();
        exitLogs.forEach(log => {
            if (log.metadata) {
                try {
                    const meta = JSON.parse(log.metadata);
                    if (meta.last_page) {
                        exitPagesMap.set(meta.last_page, (exitPagesMap.get(meta.last_page) || 0) + 1);
                    }
                } catch (e) { }
            }
        });

        const topExitPages = Array.from(exitPagesMap.entries())
            .map(([path, count]) => ({ path, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // 6. Recent Logs
        const recentLogs = await prisma.analyticsLog.findMany({
            take: 50,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true, email: true } } }
        });

        // 8. Customer Intelligence (RFM & CLV)
        const customers = await prisma.user.findMany({
            where: { role: 'user' },
            include: {
                orders: {
                    select: { total: true, createdAt: true }
                }
            }
        });

        const customerMetrics = customers.map(c => {
            const totalSpent = c.orders.reduce((sum, o) => sum + o.total, 0);
            const totalOrders = c.orders.length;
            const lastOrderDate = c.orders.length > 0
                ? c.orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
                : new Date(0);
            const lastPurchaseDays = Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));

            return {
                id: c.id,
                name: c.name,
                totalSpent,
                totalOrders,
                lastPurchaseDays
            };
        }).filter(c => c.totalOrders > 0);

        // Import dynamically
        const { segmentCustomers, predictCLV } = await import('../utils/analytics.js');
        const customerSegments = segmentCustomers(customerMetrics);

        // Calculate Average CLV
        const totalCLV = customerMetrics.reduce((sum, c) => {
            const avgOrderValue = c.totalSpent / c.totalOrders;
            const purchaseFrequency = c.totalOrders; // Simplified (total orders over lifetime)
            // Ideally frequency is orders per year. Let's assume lifespan is 1 year for simplicity or calculate actual tenure.
            return sum + predictCLV(avgOrderValue, purchaseFrequency, 1);
        }, 0);
        const avgCLV = customerMetrics.length > 0 ? totalCLV / customerMetrics.length : 0;

        // 7. Revenue Forecast
        const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const dailyRevenue = await prisma.order.groupBy({
            by: ['createdAt'],
            where: { createdAt: { gte: last30Days } },
            _sum: { total: true },
        });

        // Aggregate by day
        const revenueMap = new Map<string, number>();
        dailyRevenue.forEach(item => {
            const date = item.createdAt.toISOString().split('T')[0];
            revenueMap.set(date, (revenueMap.get(date) || 0) + (item._sum.total || 0));
        });

        const historicalData = Array.from(revenueMap.entries())
            .map(([date, sales]) => ({ date, sales }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Import dynamically to avoid top-level import issues if file doesn't exist yet
        const { forecastSales } = await import('../utils/analytics.js');
        const forecast = forecastSales(historicalData, 7);

        res.json({
            overview: {
                totalRequests,
                uniqueVisitors: uniqueVisitors.length,
                avgSessionDuration,
                activeUsers: activeVisitors.size,
                usersInCheckout
            },
            traffic,
            topPages: topPages.map(p => ({ path: p.path, count: p._count.path })),
            topExitPages,
            forecast: {
                historical: historicalData,
                predicted: forecast
            },
            customerIntelligence: {
                segments: customerSegments,
                avgCLV
            }
        });
    } catch (error) {
        console.error('Analytics stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get customer segments (Admin only)
router.get('/customer-segments', authMiddleware, requirePermission('read:analytics'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const customers = await prisma.user.findMany({
            where: { role: 'user' },
            include: {
                orders: {
                    select: { total: true, createdAt: true }
                }
            }
        });

        const customerMetrics = customers.map(c => {
            const totalSpent = c.orders.reduce((sum, o) => sum + o.total, 0);
            const totalOrders = c.orders.length;
            const lastOrderDate = c.orders.length > 0
                ? c.orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
                : new Date(0);
            const lastPurchaseDays = Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));

            return {
                id: c.id,
                name: c.name,
                email: c.email,
                phone: c.phone,
                totalSpent,
                totalOrders,
                lastPurchaseDays,
                lastOrderDate
            };
        }).filter(c => c.totalOrders > 0);

        const { segmentCustomers } = await import('../utils/analytics.js');
        const segments = segmentCustomers(customerMetrics);

        res.json(segments);
    } catch (error) {
        console.error('Customer segments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get product recommendations (bundles)
router.get('/recommendations/bundles', authMiddleware, requirePermission('read:analytics'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Fetch completed orders
        const rawOrders = await prisma.order.findMany({
            where: { status: 'delivered' },
            take: 1000 // Analyze last 1000 orders
        });

        // Parse items from JSON string
        const orders = rawOrders.map(order => ({
            ...order,
            items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
        }));

        const { getBundleRecommendations } = await import('../utils/analytics.js');
        const recommendations = getBundleRecommendations(orders);

        // Enhance with product details
        const enhancedRecommendations = await Promise.all(recommendations.map(async (rec) => {
            const products = await prisma.product.findMany({
                where: { id: { in: rec.products } },
                select: { id: true, name: true, price: true, images: true, category: true }
            });
            return {
                ...rec,
                productDetails: products
            };
        }));

        res.json(enhancedRecommendations);
    } catch (error) {
        console.error('Recommendations error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get recommendations for cart items
router.post('/recommendations/cart', async (req: Request, res: Response): Promise<void> => {
    try {
        const { productIds } = req.body;

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            res.json([]);
            return;
        }

        // Fetch completed orders
        const rawOrders = await prisma.order.findMany({
            where: { status: 'delivered' },
            take: 1000 // Analyze last 1000 orders
        });

        // Parse items from JSON string
        const orders = rawOrders.map(order => ({
            ...order,
            items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
        }));

        const { getRecommendationsForProducts } = await import('../utils/analytics.js');
        const recommendations = getRecommendationsForProducts(orders, productIds);

        // Fetch details for recommended products
        const recommendedProducts = await prisma.product.findMany({
            where: { id: { in: recommendations.map(r => r.productId) } },
            select: { id: true, name: true, price: true, images: true, category: true, image: true }
        });

        res.json(recommendedProducts);
    } catch (error) {
        console.error('Cart recommendations error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get cohort analysis (Admin only)
router.get('/cohorts', authMiddleware, requirePermission('read:analytics'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // 1. Get all users with createdAt
        const users = await prisma.user.findMany({
            where: { role: 'user' },
            select: { id: true, createdAt: true }
        });

        // 2. Get all orders with userId and createdAt
        const orders = await prisma.order.findMany({
            select: { userId: true, createdAt: true }
        });

        const { calculateCohorts } = await import('../utils/analytics.js');
        const cohorts = calculateCohorts(users, orders);

        res.json(cohorts);
    } catch (error) {
        console.error('Cohort analysis error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Funnel Data
router.get('/funnel', authMiddleware, requirePermission('read:analytics'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(days));

        // Helper to count unique visitors for a condition
        const countVisitors = async (where: any) => {
            const result = await prisma.analyticsLog.groupBy({
                by: ['ipAddress'],
                where: {
                    createdAt: { gte: startDate },
                    ...where
                },
                _count: true
            });
            return result.length;
        };

        // 1. All Visitors
        const step1 = await countVisitors({});

        // 2. Product Views
        const step2 = await countVisitors({
            path: { startsWith: '/product/' }
        });

        // 3. Add to Cart
        const step3 = await countVisitors({
            event: 'add_to_cart'
        });

        // 4. Checkout
        const step4 = await countVisitors({
            path: '/checkout'
        });

        // 5. Purchase (Orders)
        // We can use AnalyticsLog if we track 'order_completed', but using Orders table is more accurate for actual sales
        // However, to keep it consistent with "Unique Visitors", we should ideally track 'order_completed' event.
        // Let's assume we track it or use Orders table count (which might not map 1:1 to IPs but is close enough).
        // Actually, let's use Orders table count of unique userIds (if logged in) or just total orders.
        // Better: Count unique IPs who visited '/order-success'.
        const step5 = await countVisitors({
            path: '/order-success'
        });

        res.json([
            { step: 'Visitors', count: step1, fill: '#8884d8' },
            { step: 'Product View', count: step2, fill: '#83a6ed' },
            { step: 'Add to Cart', count: step3, fill: '#8dd1e1' },
            { step: 'Checkout', count: step4, fill: '#82ca9d' },
            { step: 'Purchase', count: step5, fill: '#a4de6c' }
        ]);
    } catch (error) {
        console.error('Funnel data error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Heatmap Data (Click Density)
router.get('/heatmap', authMiddleware, requirePermission('read:analytics'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { path } = req.query;
        if (!path) {
            res.status(400).json({ error: 'Path is required' });
            return;
        }

        const clicks = await prisma.analyticsLog.findMany({
            where: {
                event: 'user_action',
                path: String(path),
                metadata: { contains: '"action":"click"' } // Basic filter, refine in JS
            },
            select: { metadata: true }
        });

        // Aggregate clicks by element
        const elementMap = new Map<string, number>();

        clicks.forEach(log => {
            if (log.metadata) {
                try {
                    const meta = JSON.parse(log.metadata);
                    if (meta.action === 'click' && meta.element) {
                        // Create a signature for the element
                        const sig = meta.element.text || meta.element.id || meta.element.className || meta.element.tagName;
                        if (sig && sig !== 'unknown') {
                            elementMap.set(sig, (elementMap.get(sig) || 0) + 1);
                        }
                    }
                } catch (e) { }
            }
        });

        const heatmap = Array.from(elementMap.entries())
            .map(([element, count]) => ({ element, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20); // Top 20 elements

        res.json(heatmap);
    } catch (error) {
        console.error('Heatmap data error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
