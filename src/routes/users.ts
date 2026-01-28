import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requirePermission, AuthRequest } from '../middleware/auth.js';
import { createActivityLog } from '../services/activity.js';
import bcrypt from 'bcrypt';

const router = Router();
const prisma = new PrismaClient();

// Admin: Get all users
router.get('/', authMiddleware, requirePermission('read:users'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                balance: true,
                role: true,
                isActive: true,
                createdAt: true,
                _count: {
                    select: {
                        orders: true,
                        transactions: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin: Update user role
router.put('/:id/role', authMiddleware, requirePermission('write:users'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        const validRoles = ['user', 'admin', 'reseller', 'editor', 'support', 'analyst'];
        if (!validRoles.includes(role)) {
            res.status(400).json({ error: 'Invalid role' });
            return;
        }

        const user = await prisma.user.update({
            where: { id },
            data: { role }
        });

        await createActivityLog({
            type: 'user',
            action: 'updated',
            description: `Updated user role to ${role}: ${user.email}`,
            userId: req.userId,
            metadata: { targetUserId: id, role }
        });

        res.json({ user });
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin: Toggle user status (active/inactive)
router.put('/:id/status', authMiddleware, requirePermission('write:users'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        if (typeof isActive !== 'boolean') {
            res.status(400).json({ error: 'isActive must be a boolean' });
            return;
        }

        const user = await prisma.user.update({
            where: { id },
            data: { isActive }
        });

        await createActivityLog({
            type: 'user',
            action: 'updated',
            description: `${isActive ? 'Activated' : 'Deactivated'} user: ${user.email}`,
            userId: req.userId,
            metadata: { targetUserId: id, isActive }
        });

        res.json({ user });
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User: Update profile (address & location)
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId!;
        const { address, city, country, zipCode, latitude, longitude } = req.body;

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                address,
                city,
                country,
                zipCode,
                latitude: latitude ? parseFloat(latitude) : undefined,
                longitude: longitude ? parseFloat(longitude) : undefined
            }
        });

        res.json({ user });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin: Create new user
router.post('/admin/create', authMiddleware, requirePermission('write:users'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, email, password, phone, role, balance } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            res.status(400).json({ error: 'Name, email, and password are required' });
            return;
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            res.status(400).json({ error: 'User with this email already exists' });
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                phone: phone || null,
                role: role || 'user',
                balance: balance ? parseFloat(balance) : 0,
                isActive: true
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                balance: true,
                role: true,
                isActive: true,
                createdAt: true
            }
        });

        await createActivityLog({
            type: 'user',
            action: 'created',
            description: `Created user: ${user.email} with role ${role}`,
            userId: req.userId,
            metadata: { targetUserId: user.id, role }
        });

        res.status(201).json({ user });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
