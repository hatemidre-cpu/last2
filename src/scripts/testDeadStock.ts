import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Testing dead stock query...');
        const daysThreshold = 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysThreshold);

        console.log('Start Date:', startDate);

        // Test 1: Count orders
        const count = await prisma.order.count();
        console.log('Total orders:', count);

        // Test 2: Raw Query
        const salesData: any[] = await prisma.$queryRaw`
            SELECT DISTINCT elem->>'id' as "productId"
            FROM "Order",
                 jsonb_array_elements(items::jsonb) as elem
            WHERE "createdAt" >= ${startDate}
              AND status != 'cancelled'
        `;

        console.log('Sales Data count:', salesData.length);
        console.log('Sample:', salesData.slice(0, 5));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
