import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { query, body, validationResult } from 'express-validator';
import { authMiddleware, requirePermission, AuthRequest } from '../middleware/auth.js';
import { createActivityLog } from '../services/activity.js';

const router = Router();
const prisma = new PrismaClient();

// Get all products (with optional category filter)
router.get(
    '/',
    [
        query('category').optional().trim(),
        query('subcategory').optional().trim(),
        query('search').optional().trim()
    ],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { category, subcategory, search } = req.query;

            const whereClause: any = {};

            if (category && category !== 'All Products') {
                // Handle multiple categories (comma-separated)
                const categories = (category as string).split(',').map(c => c.trim());
                if (categories.length > 1) {
                    whereClause.OR = categories.map(cat => ({ category: cat }));
                } else {
                    whereClause.category = category as string;
                }
            }

            if (subcategory) {
                // Handle multiple subcategories (comma-separated)
                const subcategories = (subcategory as string).split(',').map(s => s.trim());
                if (subcategories.length > 1) {
                    // If we already have OR for categories, we need to combine them
                    if (whereClause.OR) {
                        // Combine category OR with subcategory OR
                        whereClause.AND = [
                            { OR: whereClause.OR },
                            { OR: subcategories.map(sub => ({ subcategory: sub })) }
                        ];
                        delete whereClause.OR;
                    } else {
                        whereClause.OR = subcategories.map(sub => ({ subcategory: sub }));
                    }
                } else {
                    whereClause.subcategory = subcategory as string;
                }
            }

            if (search) {
                // If we already have OR for categories, we need to combine with search
                const searchCondition = [
                    { name: { contains: search as string, mode: 'insensitive' } },
                    { description: { contains: search as string, mode: 'insensitive' } }
                ];

                if (whereClause.OR) {
                    // Combine category OR with search OR
                    whereClause.AND = [
                        { OR: whereClause.OR },
                        { OR: searchCondition }
                    ];
                    delete whereClause.OR;
                } else if (whereClause.AND) {
                    // Already have AND from category+subcategory, add search
                    whereClause.AND.push({ OR: searchCondition });
                } else {
                    whereClause.OR = searchCondition;
                }
            }

            const products = await prisma.product.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
            });

            // Parse JSON strings for colors, sizes, and images
            const productsWithVariants = products.map(product => ({
                ...product,
                colors: product.colors ? JSON.parse(product.colors) : [],
                sizes: product.sizes ? JSON.parse(product.sizes) : [],
                images: product.images ? JSON.parse(product.images) : [],
            }));

            res.json({ products: productsWithVariants });
        } catch (error) {
            console.error('Get products error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// Get single product
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const product = await prisma.product.findUnique({
            where: { id },
        });

        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        res.json({
            product: {
                ...product,
                colors: product.colors ? JSON.parse(product.colors) : [],
                sizes: product.sizes ? JSON.parse(product.sizes) : [],
                images: product.images ? JSON.parse(product.images) : [],
            }
        });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin: Create product
router.post(
    '/admin',
    authMiddleware,
    requirePermission('write:products'),
    [
        body('name').trim().notEmpty(),
        body('brand').trim().notEmpty(),
        body('price').isFloat({ min: 0 }),
        body('category').trim().notEmpty(),
        body('subcategory').optional().trim(),
        body('description').trim().notEmpty(),
        body('image').optional().trim(),
        body('bgColor').trim().notEmpty(),
        body('inStock').isBoolean()
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { colors, sizes, images, ...productData } = req.body;

            const product = await prisma.product.create({
                data: {
                    ...productData,
                    colors: colors ? JSON.stringify(colors) : null,
                    sizes: sizes ? JSON.stringify(sizes) : null,
                    images: images ? JSON.stringify(images) : null,
                }
            });

            await createActivityLog({
                type: 'product',
                action: 'created',
                description: `Created product: ${product.name}`,
                userId: req.userId,
                metadata: { productId: product.id }
            });

            res.status(201).json({ product });
        } catch (error) {
            console.error('Create product error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// Admin: Update product
router.put(
    '/admin/:id',
    authMiddleware,
    requirePermission('write:products'),
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const { colors, sizes, images, ...productData } = req.body;

            const product = await prisma.product.update({
                where: { id },
                data: {
                    ...productData,
                    colors: colors ? JSON.stringify(colors) : undefined,
                    sizes: sizes ? JSON.stringify(sizes) : undefined,
                    images: images ? JSON.stringify(images) : undefined,
                }
            });

            await createActivityLog({
                type: 'product',
                action: 'updated',
                description: `Updated product: ${product.name}`,
                userId: req.userId,
                metadata: { productId: product.id }
            });

            res.json({ product });
        } catch (error) {
            console.error('Update product error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// Admin: Delete product
router.delete(
    '/admin/:id',
    authMiddleware,
    requirePermission('write:products'),
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const { id } = req.params;

            await prisma.product.delete({
                where: { id }
            });

            await createActivityLog({
                type: 'product',
                action: 'deleted',
                description: `Deleted product: ${id}`,
                userId: req.userId,
                metadata: { productId: id }
            });

            res.json({ message: 'Product deleted successfully' });
        } catch (error) {
            console.error('Delete product error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// AI Product Search (admin only)
router.post(
    '/ai-search',
    authMiddleware,
    requirePermission('write:products'),
    [body('productName').trim().notEmpty()],
    async (req: AuthRequest, res: Response): Promise<void> => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        try {
            const { productName } = req.body;

            // Import the AI service
            const { searchProductWithAI } = await import('../services/aiProductSearch.js');

            const productData = await searchProductWithAI(productName);

            // Log activity
            if (req.userId) {
                await createActivityLog({
                    type: 'product',
                    action: 'ai_search',
                    description: `AI search for product: ${productName}`,
                    userId: req.userId,
                    metadata: { productName, result: productData.name }
                });
            }

            res.json({ product: productData });
        } catch (error: any) {
            console.error('AI product search error:', error);
            res.status(500).json({ error: error.message || 'Failed to search for product' });
        }
    }
);

export default router;
