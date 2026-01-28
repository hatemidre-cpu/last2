
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding historical orders...');

    const users = await prisma.user.findMany({ take: 5 });
    if (users.length === 0) {
        console.log('No users found. Please create users first.');
        return;
    }

    const products = await prisma.product.findMany({ take: 10 });
    if (products.length === 0) {
        console.log('No products found. Please create products first.');
        return;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60);

    const orders: any[] = [];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        // Generate 1-5 orders per day
        const dailyOrders = Math.floor(Math.random() * 5) + 1;

        // Add a slight upward trend
        const trendFactor = 1 + (d.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime());

        for (let i = 0; i < dailyOrders; i++) {
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const randomProduct = products[Math.floor(Math.random() * products.length)];
            const quantity = Math.floor(Math.random() * 3) + 1;
            const total = randomProduct.price * quantity * trendFactor;

            orders.push({
                userId: randomUser.id,
                items: JSON.stringify([{
                    id: randomProduct.id,
                    name: randomProduct.name,
                    price: randomProduct.price,
                    quantity: quantity,
                    image: randomProduct.image
                }]),
                total: parseFloat(total.toFixed(2)),
                status: 'completed',
                createdAt: new Date(d),
                updatedAt: new Date(d)
            });
        }
    }

    console.log(`Creating ${orders.length} orders...`);

    for (const order of orders) {
        await prisma.order.create({
            data: order
        });
    }

    console.log('Seeding completed!');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
