
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing raw SQL query...');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    try {
        const salesData: any[] = await prisma.$queryRaw`
        SELECT
            elem->>'id' as "productId",
            SUM(CAST(elem->>'quantity' AS INTEGER)) as "totalSold"
        FROM "Order",
                jsonb_array_elements(items::jsonb) as elem
        WHERE "createdAt" >= ${startDate}
            AND status = 'completed'
        GROUP BY "productId"
    `;

        console.log('Query successful!');
        console.log(`Found ${salesData.length} products with sales.`);
        if (salesData.length > 0) {
            console.log('Sample data:', salesData[0]);
        }
    } catch (error) {
        console.error('Query failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
