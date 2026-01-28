import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Middleware to check if user is reseller
const resellerMiddleware = async (req: AuthRequest, res: Response, next: Function) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
        });

        if (!user || (user.role !== 'reseller' && user.role !== 'admin')) {
            res.status(403).json({ error: 'Access denied. Reseller privileges required.' });
            return;
        }

        if (!user.isActive) {
            res.status(403).json({ error: 'Account is disabled.' });
            return;
        }

        next();
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get reseller stats
router.get('/stats', authMiddleware, resellerMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;

        // Get vouchers created by this reseller (using senderId logic if applicable, or we need to track who sold it)
        // For now, let's assume vouchers created by reseller are tracked via a transaction or specific logic.
        // Since the current schema doesn't explicitly link voucher creation to a user unless it's "senderId",
        // we might need to adjust logic. However, for "selling" vouchers, usually it means generating them.

        // Let's count vouchers where this user is the "sender" (assuming selling = sending/generating)
        const vouchersSold = await prisma.voucher.count({
            where: {
                // In the current schema, we don't have a "creatorId". 
                // We'll use transactions to track sales.
            }
        });

        // Get total revenue from "voucher_sell" transactions
        const transactions = await prisma.transaction.findMany({
            where: {
                userId,
                type: 'voucher_sell'
            }
        });

        const totalRevenue = transactions.reduce((acc, curr) => acc + curr.amount, 0);
        const totalVouchers = transactions.length;

        res.json({
            totalRevenue,
            totalVouchers
        });
    } catch (error) {
        console.error('Get reseller stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Sell/Create Voucher
router.post(
    '/vouchers',
    authMiddleware,
    resellerMiddleware,
    [
        body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
        body('code').optional().isString(),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { amount, code } = req.body;
            const userId = req.userId!;

            // Check reseller balance
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user || user.balance < amount) {
                res.status(400).json({ error: 'Insufficient balance to generate voucher' });
                return;
            }

            // Generate unique code if not provided
            const voucherCode = code || Math.random().toString(36).substring(2, 10).toUpperCase();

            // Create voucher and deduct balance in transaction
            const [voucher] = await prisma.$transaction([
                prisma.voucher.create({
                    data: {
                        code: voucherCode,
                        amount,
                        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                        // We don't have a creator field, but we track the transaction
                    }
                }),
                prisma.user.update({
                    where: { id: userId },
                    data: { balance: user.balance - amount }
                }),
                prisma.transaction.create({
                    data: {
                        userId,
                        type: 'voucher_sell',
                        amount: amount, // Positive for revenue tracking? No, they are buying the voucher to sell it. 
                        // Actually, if they are "selling" it, they are generating it from their balance.
                        // So it costs them balance.
                        description: `Generated voucher ${voucherCode}`
                    }
                })
            ]);

            res.status(201).json({ voucher });
        } catch (error) {
            console.error('Create voucher error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

export default router;
