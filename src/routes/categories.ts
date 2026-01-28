import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { authMiddleware, requirePermission, AuthRequest } from '../middleware/auth.js';
import { createActivityLog } from '../services/activity.js';

const router = Router();
const prisma = new PrismaClient();

// Get all categories (public)
router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const categories = await prisma.category.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' },
        });

        res.json({ categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create category (admin only)
router.post(
    '/admin',
    authMiddleware,
    requirePermission('write:products'),
    [
        body('name').trim().notEmpty(),
        body('subcategories').isArray(),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        try {
            const { name, subcategories } = req.body;

            // Check if category already exists
            const existing = await prisma.category.findUnique({
                where: { name }
            });

            if (existing) {
                res.status(400).json({ error: 'Category already exists' });
                return;
            }

            // Get the highest order number
            const maxOrder = await prisma.category.findFirst({
                orderBy: { order: 'desc' },
                select: { order: true }
            });

            const category = await prisma.category.create({
                data: {
                    name,
                    subcategories,
                    order: (maxOrder?.order ?? -1) + 1,
                    isActive: true,
                }
            });

            // Log activity
            if (req.user) {
                await createActivityLog({
                    type: 'product',
                    action: 'created',
                    description: `Created category: ${name}`,
                    userId: req.user.id,
                    metadata: { categoryId: category.id, name }
                });
            }

            res.json({ category });
        } catch (error) {
            console.error('Create category error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// Update category (admin only)
router.put(
    '/admin/:id',
    authMiddleware,
    requirePermission('write:products'),
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const { name, subcategories, order, isActive } = req.body;

            const updateData: any = {};
            if (name !== undefined) updateData.name = name;
            if (subcategories !== undefined) updateData.subcategories = subcategories;
            if (order !== undefined) updateData.order = order;
            if (isActive !== undefined) updateData.isActive = isActive;

            const category = await prisma.category.update({
                where: { id },
                data: updateData
            });

            // Log activity
            if (req.user) {
                await createActivityLog({
                    type: 'product',
                    action: 'updated',
                    description: `Updated category: ${category.name}`,
                    userId: req.user.id,
                    metadata: { categoryId: id, changes: updateData }
                });
            }

            res.json({ category });
        } catch (error) {
            console.error('Update category error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// Delete category (admin only)
router.delete(
    '/admin/:id',
    authMiddleware,
    requirePermission('write:products'),
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const { id } = req.params;

            const category = await prisma.category.findUnique({
                where: { id }
            });

            if (!category) {
                res.status(404).json({ error: 'Category not found' });
                return;
            }

            // Check if any products use this category
            const productsCount = await prisma.product.count({
                where: { category: category.name }
            });

            if (productsCount > 0) {
                res.status(400).json({
                    error: `Cannot delete category. ${productsCount} product(s) are using this category.`
                });
                return;
            }

            await prisma.category.delete({
                where: { id }
            });

            // Log activity
            if (req.user) {
                await createActivityLog({
                    type: 'product',
                    action: 'deleted',
                    description: `Deleted category: ${category.name}`,
                    userId: req.user.id,
                    metadata: { categoryId: id, name: category.name }
                });
            }

            res.json({ message: 'Category deleted successfully' });
        } catch (error) {
            console.error('Delete category error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

export default router;
