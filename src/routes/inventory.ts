import { Router, Request, Response } from 'express';
import { inventoryService } from '../services/inventoryService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get low stock alerts
router.get('/alerts', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const items = await inventoryService.getLowStockItems();
        res.json(items);
    } catch (error) {
        console.error('Inventory alerts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get inventory predictions
router.get('/predictions', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const predictions = await inventoryService.getInventoryPredictions();
        res.json(predictions);
    } catch (error) {
        console.error('Inventory predictions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get dead stock
router.get('/dead-stock', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const days = req.query.days ? Number(req.query.days) : 90;
        const items = await inventoryService.getDeadStock(days);
        res.json(items);
    } catch (error) {
        console.error('Dead stock error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get inventory valuation
router.get('/valuation', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const valuation = await inventoryService.getInventoryValuation();
        res.json(valuation);
    } catch (error) {
        console.error('Valuation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update global threshold setting
router.post('/settings', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { threshold } = req.body;

        await prisma.settings.upsert({
            where: { key: 'low_stock_threshold' },
            update: { value: threshold },
            create: { key: 'low_stock_threshold', value: threshold }
        });

        res.json({ success: true, threshold });
    } catch (error) {
        console.error('Inventory settings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
