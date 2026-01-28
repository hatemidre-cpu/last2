import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

async function main() {
    // 1. Get Gel Liner ID
    const gelLiner = await prisma.product.findFirst({
        where: { name: 'Gel Liner' }
    });

    if (!gelLiner) {
        console.error('Gel Liner not found');
        return;
    }

    console.log('Gel Liner ID:', gelLiner.id);

    // 2. Call Recommendations Endpoint
    // We need to login first to get a token, or use a mock request if we can't easily login via script.
    // Actually, the endpoint requires authMiddleware.
    // Let's just test the logic function directly or mock the request.
    // Testing the logic function is easier and faster.

    const { getRecommendationsForProducts } = await import('../utils/analytics.js');

    // Fetch orders
    const rawOrders = await prisma.order.findMany({
        where: { status: 'delivered' },
        take: 1000
    });

    const orders = rawOrders.map(order => ({
        ...order,
        items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
    }));

    console.log(`Analyzing ${orders.length} orders...`);

    const recommendations = getRecommendationsForProducts(orders, [gelLiner.id]);
    console.log('Recommendations:', recommendations);

    // Check if Rouge Velvet Lipstick is in recommendations
    const rougeVelvet = await prisma.product.findFirst({
        where: { name: 'Rouge Velvet Lipstick' }
    });

    if (rougeVelvet) {
        const rec = recommendations.find(r => r.productId === rougeVelvet.id);
        if (rec) {
            console.log('SUCCESS: Found Rouge Velvet Lipstick in recommendations!');
        } else {
            console.log('FAILURE: Rouge Velvet Lipstick NOT found in recommendations.');
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
