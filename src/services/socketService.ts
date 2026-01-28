import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
    user?: any;
}

let io: SocketIOServer;

export const initSocket = (httpServer: HttpServer) => {
    io = new SocketIOServer(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:5173",
            methods: ["GET", "POST"]
        }
    });

    io.use((socket: AuthenticatedSocket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication error"));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
            socket.user = decoded;
            next();
        } catch (err) {
            next(new Error("Authentication error"));
        }
    });

    io.on('connection', (socket: AuthenticatedSocket) => {
        console.log(`User connected: ${socket.user?.userId}`);

        // Join user to their own room for private notifications
        if (socket.user?.userId) {
            socket.join(`user:${socket.user.userId}`);
        }

        // Join admin room if user is admin
        if (socket.user?.role === 'ADMIN') {
            socket.join('admin-room');
        }

        // Chat events
        socket.on('join_channel', (channelId: string) => {
            console.log(`User ${socket.user?.userId} joining channel ${channelId}`);
            socket.join(`channel:${channelId}`);
        });

        socket.on('leave_channel', (channelId: string) => {
            socket.leave(`channel:${channelId}`);
        });

        socket.on('typing', ({ channelId, isTyping }) => {
            socket.to(`channel:${channelId}`).emit('user_typing', {
                userId: socket.user?.userId,
                channelId,
                isTyping
            });
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

// Helper functions to emit events
export const notifyUser = (userId: string, notification: any) => {
    if (io) {
        io.to(`user:${userId}`).emit('notification', notification);
    }
};

export const notifyAdmins = (event: string, data: any) => {
    if (io) {
        io.to('admin-room').emit(event, data);
    }
};

export const notifyChannel = (channelId: string, event: string, data: any) => {
    if (io) {
        io.to(`channel:${channelId}`).emit(event, data);
    }
};

export const broadcastUpdate = (event: string, data: any) => {
    if (io) {
        io.emit(event, data);
    }
};
