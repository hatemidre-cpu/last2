import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Check if user has purchased a product
router.get('/has-purchased/:productId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { productId } = req.params;
        const userId = req.userId;

        // Find orders where user bought this product
        const orders = await prisma.order.findMany({
            where: {
                userId,
                status: { in: ['completed', 'processing'] } // Only count completed/processing orders
            },
            select: { items: true }
        });

        // Check if any order contains this product
        let hasPurchased = false;
        for (const order of orders) {
            try {
                const items = JSON.parse(order.items);
                if (items.some((item: any) => item.id === productId)) {
                    hasPurchased = true;
                    break;
                }
            } catch (e) {
                console.error('Error parsing order items:', e);
            }
        }

        res.json({ hasPurchased });
    } catch (error) {
        console.error('Check purchase error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
