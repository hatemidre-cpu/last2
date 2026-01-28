import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding cart-based recommendations...');

    // These are the product IDs from the user's cart
    const cartProductIds = [
        '609cc619-b34a-46de-8ba3-5b763225de79',
        '148e3d54-b5f1-4f2e-b62f-92b319a2ebb1',
        '1ac1ea9a-2adc-4baf-97a3-05939a8390f7'
    ];

    // Get these products
    const cartProducts = await prisma.product.findMany({
        where: { id: { in: cartProductIds } }
    });

    if (cartProducts.length === 0) {
        console.log('No products found with these IDs.');
        return;
    }

    console.log('Cart products:', cartProducts.map(p => p.name));

    // Get some other products to recommend
    const otherProducts = await prisma.product.findMany({
        where: { id: { notIn: cartProductIds } },
        take: 3
    });

    if (otherProducts.length === 0) {
        console.log('No other products found.');
        return;
    }

    console.log('Products to recommend:', otherProducts.map(p => p.name));

    // Get a user
    const user = await prisma.user.findFirst({ where: { role: 'user' } });
    if (!user) {
        console.log('No user found.');
        return;
    }

    // Create orders that pair cart products with recommendation products
    // Pattern: Cart Product 1 + Recommendation Product 1
    for (let i = 0; i < Math.min(cartProducts.length, otherProducts.length); i++) {
        const cartProduct = cartProducts[i];
        const recProduct = otherProducts[i];

        // Create 3 orders for each pair to increase frequency
        for (let j = 0; j < 3; j++) {
            await prisma.order.create({
                data: {
                    userId: user.id,
                    status: 'delivered',
                    total: cartProduct.price + recProduct.price,
                    items: JSON.stringify([
                        { id: cartProduct.id, quantity: 1, price: cartProduct.price, name: cartProduct.name },
                        { id: recProduct.id, quantity: 1, price: recProduct.price, name: recProduct.name }
                    ])
                }
            });
        }

        console.log(`Created 3 orders pairing "${cartProduct.name}" with "${recProduct.name}"`);
    }

    console.log('✅ Seeding complete! Recommendations should now appear on checkout.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
