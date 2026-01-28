import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requirePermission, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Admin: Get dashboard stats
router.get('/', authMiddleware, requirePermission('read:analytics'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const [
            totalUsers,
            totalProducts,
            totalOrders,
            totalVouchers,
            recentOrders,
            orderStats
        ] = await Promise.all([
            prisma.user.count(),
            prisma.product.count(),
            prisma.order.count(),
            prisma.voucher.count(),
            prisma.order.findMany({
                take: 5,
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.order.groupBy({
                by: ['status'],
                _count: true
            })
        ]);

        const totalRevenue = await prisma.order.aggregate({
            _sum: {
                total: true
            }
        });

        const stats = {
            totalUsers,
            totalProducts,
            totalOrders,
            totalVouchers,
            totalRevenue: totalRevenue._sum.total || 0,
            ordersByStatus: orderStats.reduce((acc, stat) => {
                acc[stat.status] = stat._count;
                return acc;
            }, {} as Record<string, number>),
            recentOrders: recentOrders.map(order => ({
                ...order,
                items: JSON.parse(order.items)
            }))
        };

        res.json({ stats });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
