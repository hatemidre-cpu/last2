import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { hasPermission } from '../config/permissions.js';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
    userId?: string;
    userRole?: string;
}

export const authMiddleware = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        req.userId = decoded.userId;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

export const adminMiddleware = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        req.userId = decoded.userId;

        // Check if user is admin
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { role: true }
        });

        if (!user || user.role !== 'admin') {
            res.status(403).json({ error: 'Admin access required' });
            return;
        }

        req.userRole = user.role;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

export const requirePermission = (permission: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Ensure userId is present (authMiddleware should run first, but we double check or handle standalone)
            let userId = req.userId;

            if (!userId) {
                const token = req.headers.authorization?.replace('Bearer ', '');
                if (!token) {
                    res.status(401).json({ error: 'Authentication required' });
                    return;
                }
                const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
                userId = decoded.userId;
                req.userId = userId;
            }

            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { role: true }
            });

            if (!user) {
                res.status(401).json({ error: 'User not found' });
                return;
            }

            if (!hasPermission(user.role, permission)) {
                res.status(403).json({ error: `Permission denied: ${permission} required` });
                return;
            }

            req.userRole = user.role;
            next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(401).json({ error: 'Invalid or expired token' });
        }
    };
};
