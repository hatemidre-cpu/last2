import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Get user's available coupons
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId!;
        const now = new Date();

        // Get user-specific coupons
        const userCoupons = await prisma.userCoupon.findMany({
            where: { userId },
            include: {
                coupon: true
            }
        });

        // Get general coupons (not assigned to specific users)
        const generalCoupons = await prisma.coupon.findMany({
            where: {
                assignedToUserId: null,
                isActive: true,
                validFrom: { lte: now },
                validUntil: { gte: now }
            }
        });

        // Combine and format
        const allCoupons = [
            ...userCoupons.map(uc => ({
                ...uc.coupon,
                isUsed: uc.isUsed,
                usedAt: uc.usedAt,
                isAssigned: true
            })),
            ...generalCoupons.map(c => ({
                ...c,
                isUsed: false,
                usedAt: null,
                isAssigned: false
            }))
        ];

        res.json({ coupons: allCoupons });
    } catch (error) {
        console.error('Get coupons error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Validate coupon and calculate discount
router.post('/validate', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId!;
        const { code, total } = req.body;

        if (!code || !total) {
            res.status(400).json({ error: 'Code and total are required' });
            return;
        }

        const now = new Date();

        // Find coupon
        const coupon = await prisma.coupon.findUnique({
            where: { code: code.toUpperCase() }
        });

        if (!coupon) {
            res.status(404).json({ error: 'Invalid coupon code' });
            return;
        }

        // Check if coupon is active
        if (!coupon.isActive) {
            res.status(400).json({ error: 'This coupon is no longer active' });
            return;
        }

        // Check validity dates
        if (now < coupon.validFrom || now > coupon.validUntil) {
            res.status(400).json({ error: 'This coupon has expired' });
            return;
        }

        // Check usage limit
        if (coupon.usedCount >= coupon.usageLimit) {
            res.status(400).json({ error: 'This coupon has reached its usage limit' });
            return;
        }

        // Check if assigned to specific user
        if (coupon.assignedToUserId && coupon.assignedToUserId !== userId) {
            res.status(403).json({ error: 'This coupon is not available for you' });
            return;
        }

        // Check if user already used this coupon
        if (coupon.assignedToUserId) {
            const userCoupon = await prisma.userCoupon.findUnique({
                where: {
                    userId_couponId: {
                        userId,
                        couponId: coupon.id
                    }
                }
            });

            if (userCoupon?.isUsed) {
                res.status(400).json({ error: 'You have already used this coupon' });
                return;
            }
        }

        // Check minimum purchase
        if (total < coupon.minPurchase) {
            res.status(400).json({
                error: `Minimum purchase of $${coupon.minPurchase.toFixed(2)} required`
            });
            return;
        }

        // Calculate discount
        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = (total * coupon.discountValue) / 100;
            if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
                discountAmount = coupon.maxDiscount;
            }
        } else {
            discountAmount = coupon.discountValue;
        }

        // Ensure discount doesn't exceed total
        if (discountAmount > total) {
            discountAmount = total;
        }

        res.json({
            valid: true,
            discountAmount: parseFloat(discountAmount.toFixed(2)),
            finalTotal: parseFloat((total - discountAmount).toFixed(2)),
            coupon: {
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue
            }
        });
    } catch (error) {
        console.error('Validate coupon error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin: Create coupon
router.post('/admin/create', adminMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const {
            code,
            discountType,
            discountValue,
            minPurchase,
            maxDiscount,
            usageLimit,
            validFrom,
            validUntil,
            assignedToUserId
        } = req.body;

        if (!code || !discountType || !discountValue || !validUntil) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        if (discountType !== 'percentage' && discountType !== 'fixed') {
            res.status(400).json({ error: 'Invalid discount type' });
            return;
        }

        const coupon = await prisma.coupon.create({
            data: {
                code: code.toUpperCase(),
                discountType,
                discountValue: parseFloat(discountValue),
                minPurchase: minPurchase ? parseFloat(minPurchase) : 0,
                maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
                usageLimit: usageLimit || 1,
                validFrom: validFrom ? new Date(validFrom) : new Date(),
                validUntil: new Date(validUntil),
                assignedToUserId: assignedToUserId || null
            }
        });

        // If assigned to user, create UserCoupon entry
        if (assignedToUserId) {
            await prisma.userCoupon.create({
                data: {
                    userId: assignedToUserId,
                    couponId: coupon.id
                }
            });
        }

        res.status(201).json({ coupon });
    } catch (error: any) {
        console.error('Create coupon error:', error);
        if (error.code === 'P2002') {
            res.status(400).json({ error: 'Coupon code already exists' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Admin: Get all coupons
router.get('/admin/all', adminMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const coupons = await prisma.coupon.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { userCoupons: true }
                }
            }
        });

        res.json({ coupons });
    } catch (error) {
        console.error('Get all coupons error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin: Assign coupon to user
router.post('/admin/assign', adminMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { couponId, userId } = req.body;

        if (!couponId || !userId) {
            res.status(400).json({ error: 'Coupon ID and User ID are required' });
            return;
        }

        const userCoupon = await prisma.userCoupon.create({
            data: {
                userId,
                couponId
            }
        });

        res.status(201).json({ userCoupon });
    } catch (error: any) {
        console.error('Assign coupon error:', error);
        if (error.code === 'P2002') {
            res.status(400).json({ error: 'User already has this coupon' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

export default router;
