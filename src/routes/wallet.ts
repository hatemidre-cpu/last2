import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Get user balance (protected)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId!;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { balance: true },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({ balance: user.balance });
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add funds to wallet (protected)
router.post(
    '/add-funds',
    authMiddleware,
    [body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0')],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { amount } = req.body;
            const userId = req.userId!;

            // Update balance and create transaction
            const [user] = await prisma.$transaction([
                prisma.user.update({
                    where: { id: userId },
                    data: { balance: { increment: amount } },
                }),
                prisma.transaction.create({
                    data: {
                        userId,
                        type: 'add_funds',
                        amount,
                        description: `Added funds to wallet`,
                    },
                }),
            ]);

            res.json({ balance: user.balance });
        } catch (error) {
            console.error('Add funds error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// Get transaction history (protected)
router.get('/transactions', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId!;

        const transactions = await prisma.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ transactions });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
