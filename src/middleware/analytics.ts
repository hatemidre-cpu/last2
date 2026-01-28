import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

interface DecodedToken {
    userId: string;
}

export const analyticsMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // Fire and forget - don't await to avoid slowing down the request
    logRequest(req).catch(err => console.error('Analytics logging error:', err));
    next();
};

const logRequest = async (req: Request) => {
    try {
        const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        const path = req.path;
        const method = req.method;

        // Skip logging for static assets or health checks if needed
        if (path.startsWith('/static') || path === '/health') return;

        let userId: string | null = null;

        // Try to extract user ID from token
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                if (process.env.JWT_SECRET) {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
                    userId = decoded.userId;
                }
            } catch (e) {
                // Ignore token errors (expired, invalid) for logging purposes
            }
        }

        await prisma.analyticsLog.create({
            data: {
                ipAddress,
                userAgent,
                path,
                method,
                event: 'api_request',
                userId,
                metadata: JSON.stringify({
                    query: req.query,
                    // Don't log body for privacy/security reasons by default, or sanitize it
                })
            }
        });
    } catch (error) {
        console.error('Failed to log analytics:', error);
    }
};
