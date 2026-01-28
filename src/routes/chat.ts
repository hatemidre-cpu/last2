import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { adminMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Get all channels for the current user
router.get('/channels', adminMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;

        const channels = await prisma.chatChannel.findMany({
            where: {
                participants: {
                    some: {
                        userId: userId
                    }
                }
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                role: true
                            }
                        }
                    }
                },
                messages: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        res.json(channels);
    } catch (error) {
        console.error('Get channels error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new channel (Direct Message or Group)
router.post('/channels', adminMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { type, participantIds, name } = req.body; // participantIds should NOT include current user
        const currentUserId = req.user?.userId;

        if (!currentUserId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        // For direct messages, check if channel already exists
        if (type === 'direct' && participantIds.length === 1) {
            const otherUserId = participantIds[0];

            const existingChannel = await prisma.chatChannel.findFirst({
                where: {
                    type: 'direct',
                    AND: [
                        { participants: { some: { userId: currentUserId } } },
                        { participants: { some: { userId: otherUserId } } }
                    ]
                },
                include: {
                    participants: {
                        include: {
                            user: {
                                select: { id: true, name: true, email: true }
                            }
                        }
                    }
                }
            });

            if (existingChannel) {
                res.json(existingChannel);
                return;
            }
        }

        // Create new channel
        const allParticipantIds = [...participantIds, currentUserId];

        const channel = await prisma.chatChannel.create({
            data: {
                type,
                name,
                participants: {
                    create: allParticipantIds.map((id: string) => ({
                        userId: id
                    }))
                }
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });

        res.status(201).json(channel);
    } catch (error) {
        console.error('Create channel error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get messages for a channel
router.get('/channels/:channelId/messages', adminMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { channelId } = req.params;
        const { cursor } = req.query; // For pagination
        const limit = 50;

        const messages = await prisma.chatMessage.findMany({
            where: {
                channelId
            },
            take: limit,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor as string } : undefined,
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        res.json(messages.reverse()); // Return oldest first for chat UI
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Send a message
router.post('/channels/:channelId/messages', adminMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { channelId } = req.params;
        const { content } = req.body;
        const senderId = req.user?.userId;

        if (!senderId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const message = await prisma.chatMessage.create({
            data: {
                content,
                channelId,
                senderId
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        // Update channel updatedAt
        await prisma.chatChannel.update({
            where: { id: channelId },
            data: { updatedAt: new Date() }
        });

        // Broadcast via Socket.io (we'll need to import this)
        // For now, we'll just return the message and handle socket in the service or import it here
        // Ideally: notifyChannel(channelId, 'new_message', message);

        // Dynamic import to avoid circular dependency issues if any
        const { notifyChannel } = await import('../services/socketService.js');
        notifyChannel(channelId, 'new_message', message);

        res.status(201).json(message);
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
