import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Redeem voucher (protected)
router.post(
    '/redeem',
    authMiddleware,
    [body('code').trim().notEmpty().withMessage('Voucher code is required')],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { code } = req.body;
            const userId = req.userId!;

            // Find voucher
            const voucher = await prisma.voucher.findUnique({
                where: { code: code.toUpperCase() },
            });

            if (!voucher) {
                res.status(404).json({ error: 'Invalid voucher code' });
                return;
            }

            if (voucher.isUsed) {
                res.status(400).json({ error: 'This voucher has already been used' });
                return;
            }

            if (new Date(voucher.expiresAt) < new Date()) {
                res.status(400).json({ error: 'This voucher has expired' });
                return;
            }

            // Redeem voucher: mark as used, add to balance, create transaction
            const [updatedVoucher, user] = await prisma.$transaction([
                prisma.voucher.update({
                    where: { code: code.toUpperCase() },
                    data: { isUsed: true, usedBy: userId },
                }),
                prisma.user.update({
                    where: { id: userId },
                    data: { balance: { increment: voucher.amount } },
                }),
                prisma.transaction.create({
                    data: {
                        userId,
                        type: 'voucher_redeem',
                        amount: voucher.amount,
                        description: `Redeemed voucher ${voucher.code}`,
                    },
                }),
            ]);

            res.json({
                success: true,
                amount: voucher.amount,
                message: `Successfully redeemed $${voucher.amount}!`,
                balance: user.balance,
            });
        } catch (error) {
            console.error('Redeem voucher error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// Send voucher to another user (protected)
router.post(
    '/send',
    authMiddleware,
    [
        body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least $1'),
        body('recipientEmail').isEmail().withMessage('Valid recipient email is required'),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { amount, recipientEmail } = req.body;
            const userId = req.userId!;

            // Get sender's balance
            const sender = await prisma.user.findUnique({
                where: { id: userId },
            });

            if (!sender) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            if (sender.balance < amount) {
                res.status(400).json({ error: 'Insufficient balance' });
                return;
            }

            // Generate voucher code
            const code = `GIFT${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

            // Create voucher, deduct balance, create transaction
            const [voucher] = await prisma.$transaction([
                prisma.voucher.create({
                    data: {
                        code,
                        amount,
                        expiresAt,
                    },
                }),
                prisma.user.update({
                    where: { id: userId },
                    data: { balance: { decrement: amount } },
                }),
                prisma.transaction.create({
                    data: {
                        userId,
                        type: 'voucher_sent',
                        amount: -amount,
                        description: `Sent voucher to ${recipientEmail}`,
                        relatedEmail: recipientEmail,
                    },
                }),
            ]);

            res.json({
                success: true,
                code: voucher.code,
                message: `Voucher ${voucher.code} sent to ${recipientEmail}!`,
            });
        } catch (error) {
            console.error('Send voucher error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// Get available vouchers (protected)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const vouchers = await prisma.voucher.findMany({
            where: {
                isUsed: false,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ vouchers });
    } catch (error) {
        console.error('Get vouchers error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin: Create voucher
router.post(
    '/admin/create',
    adminMiddleware,
    [
        body('code').trim().notEmpty().toUpperCase(),
        body('amount').isFloat({ min: 1 }),
        body('expiresAt').isISO8601()
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { code, amount, expiresAt } = req.body;

            const voucher = await prisma.voucher.create({
                data: {
                    code: code.toUpperCase(),
                    amount,
                    expiresAt: new Date(expiresAt)
                }
            });

            res.status(201).json({ voucher });
        } catch (error) {
            console.error('Create voucher error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// Admin: Delete voucher
router.delete(
    '/admin/:id',
    adminMiddleware,
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const { id } = req.params;

            await prisma.voucher.delete({
                where: { id }
            });

            res.json({ message: 'Voucher deleted successfully' });
        } catch (error) {
            console.error('Delete voucher error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// Admin: Get all vouchers (including used ones)
router.get('/admin/all', adminMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const vouchers = await prisma.voucher.findMany({
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

        res.json({ vouchers });
    } catch (error) {
        console.error('Get all vouchers error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
