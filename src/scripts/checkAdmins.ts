import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const admins = await prisma.user.findMany({
            where: {
                role: 'admin'
            }
        });

        console.log('Found', admins.length, 'admin users:');
        admins.forEach(admin => {
            console.log(`- ${admin.email} (ID: ${admin.id}, Role: ${admin.role})`);
        });

        if (admins.length === 0) {
            console.log('No admin users found! You should run the createAdmin script.');
        }
    } catch (error) {
        console.error('Error checking admins:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
