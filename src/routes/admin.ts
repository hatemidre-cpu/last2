import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminMiddleware, requirePermission } from '../middleware/auth.js';
import { createActivityLog } from '../services/activity.js';

const router = Router();
const prisma = new PrismaClient();

// Get activity logs
router.get('/activity', authMiddleware, requirePermission('read:analytics'), async (req, res) => {
    try {
        const { limit = 50, type, userId } = req.query;

        const where: any = {};
        if (type) where.type = type;
        if (userId) where.userId = userId;

        const logs = await prisma.activityLog.findMany({
            where,
            take: parseInt(limit as string),
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        res.json({ logs });
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
});

// Get notifications for user
router.get('/notifications', authMiddleware, async (req, res) => {
    try {
        const userId = (req as any).user.userId;
        const { unreadOnly = false } = req.query;

        const where: any = { userId };
        if (unreadOnly === 'true') {
            where.read = false;
        }

        const notifications = await prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        const unreadCount = await prisma.notification.count({
            where: { userId, read: false }
        });

        res.json({ notifications, unreadCount });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Mark notification as read
router.patch('/notifications/:id/read', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.userId;

        const notification = await prisma.notification.updateMany({
            where: { id, userId },
            data: { read: true }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// Mark all notifications as read
router.patch('/notifications/read-all', authMiddleware, async (req, res) => {
    try {
        const userId = (req as any).user.userId;

        await prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to update notifications' });
    }
});

// Create notification
export const createNotification = async (data: {
    type: string;
    title: string;
    message: string;
    userId?: string;
    actionUrl?: string;
    metadata?: any;
}) => {
    try {
        return await prisma.notification.create({
            data: {
                type: data.type,
                title: data.title,
                message: data.message,
                userId: data.userId,
                actionUrl: data.actionUrl,
                metadata: data.metadata
            }
        });
    } catch (error) {
        console.error('Error creating notification:', error);
    }
};

// Get system settings
router.get('/settings/:key', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { key } = req.params;

        const setting = await prisma.settings.findUnique({
            where: { key }
        });

        res.json({ setting });
    } catch (error) {
        console.error('Error fetching setting:', error);
        res.status(500).json({ error: 'Failed to fetch setting' });
    }
});

// Update system setting
router.put('/settings/:key', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        const setting = await prisma.settings.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });

        await createActivityLog({
            type: 'system',
            action: 'Settings updated',
            description: `Updated setting: ${key}`,
            userId: (req as any).user.userId
        });

        res.json({ setting });
    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({ error: 'Failed to update setting' });
    }
});

export default router;
