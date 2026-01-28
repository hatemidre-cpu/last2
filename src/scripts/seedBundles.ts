import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding bundles...');

    // Get some products
    const products = await prisma.product.findMany({ take: 5 });
    if (products.length < 2) {
        console.log('Not enough products to create bundles.');
        return;
    }

    const p1 = products[0];
    const p2 = products[1];
    const p3 = products[2];

    console.log(`Creating bundles for:`);
    console.log(`1. ${p1.name} + ${p2.name}`);
    console.log(`2. ${p2.name} + ${p3.name}`);

    // Get a user
    const user = await prisma.user.findFirst({ where: { role: 'user' } });
    if (!user) {
        console.log('No user found.');
        return;
    }

    // Create 5 orders with P1 + P2
    for (let i = 0; i < 5; i++) {
        await prisma.order.create({
            data: {
                userId: user.id,
                status: 'delivered',
                total: p1.price + p2.price,
                items: JSON.stringify([
                    { productId: p1.id, quantity: 1, price: p1.price },
                    { productId: p2.id, quantity: 1, price: p2.price }
                ])
            }
        });
    }

    // Create 3 orders with P2 + P3
    for (let i = 0; i < 3; i++) {
        await prisma.order.create({
            data: {
                userId: user.id,
                status: 'delivered',
                total: p2.price + p3.price,
                items: JSON.stringify([
                    { productId: p2.id, quantity: 1, price: p2.price },
                    { productId: p3.id, quantity: 1, price: p3.price }
                ])
            }
        });
    }

    console.log('Bundles seeded successfully!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
