import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get all brands
router.get('/', async (req, res) => {
    try {
        const brands = await prisma.brand.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(brands);
    } catch (error) {
        console.error('Error fetching brands:', error);
        res.status(500).json({ error: 'Failed to fetch brands' });
    }
});

// Create a new brand
router.post('/', async (req, res) => {
    try {
        const { name, logo } = req.body;

        if (!name || !logo) {
            return res.status(400).json({ error: 'Name and logo are required' });
        }

        const brand = await prisma.brand.create({
            data: {
                name,
                logo
            }
        });

        res.status(201).json(brand);
    } catch (error) {
        console.error('Error creating brand:', error);
        res.status(500).json({ error: 'Failed to create brand' });
    }
});

// Delete a brand
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.brand.delete({
            where: { id }
        });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting brand:', error);
        res.status(500).json({ error: 'Failed to delete brand' });
    }
});

export default router;
