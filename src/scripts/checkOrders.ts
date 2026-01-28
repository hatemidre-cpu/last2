
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const count = await prisma.order.count();
    console.log(`Total orders: ${count}`);

    const orders = await prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
    });
    console.log('Recent orders:', orders);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
