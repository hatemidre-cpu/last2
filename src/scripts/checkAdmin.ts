import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdminRole() {
    try {
        const users = await prisma.user.findMany();
        console.log('All Users:', users);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAdminRole();
