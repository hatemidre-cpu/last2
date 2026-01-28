import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createActivityLog = async (data: {
    type: string;
    action: string;
    description: string;
    userId?: string;
    metadata?: any;
}) => {
    try {
        return await prisma.activityLog.create({
            data: {
                type: data.type,
                action: data.action,
                description: data.description,
                userId: data.userId,
                metadata: data.metadata
            }
        });
    } catch (error) {
        console.error('Error creating activity log:', error);
    }
};
