import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Signup
router.post(
    '/signup',
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('phone').optional().trim(),
    ],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { name, email, password, phone } = req.body;

            // Normalize email to lowercase
            const normalizedEmail = email.toLowerCase().trim();

            console.log('📝 Signup attempt:', normalizedEmail);
            console.log('📱 Request from:', req.headers['user-agent']);
            console.log('🌐 IP Address:', req.ip);

            // Check if user already exists (case-insensitive)
            const existingUser = await prisma.user.findUnique({
                where: { email: normalizedEmail },
            });

            console.log('🔍 Existing user check:', existingUser ? 'FOUND' : 'NOT FOUND');
            if (existingUser) {
                console.log('❌ User already exists:', normalizedEmail);
                console.log('📋 Existing user details:', {
                    id: existingUser.id,
                    email: existingUser.email,
                    name: existingUser.name,
                    createdAt: existingUser.createdAt
                });
                res.status(400).json({ error: 'User already exists with this email' });
                return;
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create user
            const user = await prisma.user.create({
                data: {
                    name,
                    email: normalizedEmail,
                    password: hashedPassword,
                    phone: phone || '',
                    balance: 0,
                },
            });

            // Generate JWT token
            const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
                expiresIn: '7d',
            });

            res.status(201).json({
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    balance: user.balance,
                    role: user.role,
                    address: null,
                    city: null,
                    country: null,
                    zipCode: null,
                    latitude: null,
                    longitude: null,
                    createdAt: user.createdAt,
                },
            });
        } catch (error) {
            console.error('Signup error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// Login
router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required'),
    ],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { email, password } = req.body;

            // Normalize email to lowercase
            const normalizedEmail = email.toLowerCase().trim();

            // Find user
            const user = await prisma.user.findUnique({
                where: { email: normalizedEmail },
            });

            if (!user) {
                res.status(401).json({ error: 'Invalid email or password' });
                return;
            }

            if (!user.isActive) {
                res.status(403).json({ error: 'Account is disabled. Please contact admin.' });
                return;
            }

            // Verify password - Write debug to file
            const fs = await import('fs');
            const debugInfo = `
=== Login Attempt ===
Time: ${new Date().toISOString()}
Email: ${email}
Password Entered: ${password}
Stored Hash: ${user.password}
`;

            const isValidPassword = await bcrypt.compare(password, user.password);

            const result = `${debugInfo}Password Valid: ${isValidPassword}
==================
`;

            fs.appendFileSync('login-debug.txt', result);

            if (!isValidPassword) {
                res.status(401).json({ error: 'Invalid email or password' });
                return;
            }

            // Generate JWT token
            const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
                expiresIn: '7d',
            });

            res.json({
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    balance: user.balance,
                    role: user.role,
                    isActive: user.isActive,
                    address: user.address,
                    city: user.city,
                    country: user.country,
                    zipCode: user.zipCode,
                    latitude: user.latitude,
                    longitude: user.longitude,
                    createdAt: user.createdAt,
                },
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                balance: true,
                role: true,
                isActive: true,
                address: true,
                city: true,
                country: true,
                zipCode: true,
                latitude: true,
                longitude: true,
                createdAt: true,
            },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
