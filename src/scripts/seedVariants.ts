import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding product variants...');

    // 1. Update an existing product (if any) or create a new one
    // Let's try to find a lipstick or similar item
    const lipstick = await prisma.product.findFirst({
        where: { name: { contains: 'Lipstick' } }
    });

    if (lipstick) {
        console.log(`Updating product: ${lipstick.name}`);
        await prisma.product.update({
            where: { id: lipstick.id },
            data: {
                colors: JSON.stringify(['Red', 'Pink', 'Nude', 'Berry']),
                sizes: JSON.stringify(['Standard', 'Mini'])
            }
        });
    } else {
        console.log('Creating new Lipstick product...');
        await prisma.product.create({
            data: {
                name: 'Velvet Matte Lipstick',
                brand: 'LuxeBeauty',
                price: 24.99,
                category: 'Makeup',
                description: 'Long-lasting matte lipstick with a velvet finish.',
                image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&q=80',
                bgColor: 'bg-red-100',
                inStock: true,
                colors: JSON.stringify(['Red', 'Pink', 'Nude', 'Berry']),
                sizes: JSON.stringify(['Standard', 'Mini'])
            }
        });
    }

    // 2. Create/Update a Foundation product
    const foundation = await prisma.product.findFirst({
        where: { name: { contains: 'Foundation' } }
    });

    if (foundation) {
        console.log(`Updating product: ${foundation.name}`);
        await prisma.product.update({
            where: { id: foundation.id },
            data: {
                colors: JSON.stringify(['Ivory', 'Beige', 'Sand', 'Honey', 'Mocha']),
                sizes: JSON.stringify(['30ml', '50ml'])
            }
        });
    } else {
        console.log('Creating new Foundation product...');
        await prisma.product.create({
            data: {
                name: 'Flawless Finish Foundation',
                brand: 'GlowCosmetics',
                price: 39.99,
                category: 'Makeup',
                description: 'Full coverage foundation for a natural glow.',
                image: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=800&q=80',
                bgColor: 'bg-orange-100',
                inStock: true,
                colors: JSON.stringify(['Ivory', 'Beige', 'Sand', 'Honey', 'Mocha']),
                sizes: JSON.stringify(['30ml', '50ml'])
            }
        });
    }

    // 3. Create/Update a Perfume product (Sizes only)
    const perfume = await prisma.product.findFirst({
        where: { category: 'Fragrance' }
    });

    if (perfume) {
        console.log(`Updating product: ${perfume.name}`);
        await prisma.product.update({
            where: { id: perfume.id },
            data: {
                sizes: JSON.stringify(['30ml', '50ml', '100ml'])
            }
        });
    } else {
        console.log('Creating new Fragrance product...');
        await prisma.product.create({
            data: {
                name: 'Midnight Bloom',
                brand: 'ScentCo',
                price: 89.99,
                category: 'Fragrance',
                description: 'A mysterious floral scent for evening wear.',
                image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80',
                bgColor: 'bg-purple-100',
                inStock: true,
                sizes: JSON.stringify(['30ml', '50ml', '100ml'])
            }
        });
    }

    console.log('Seeding completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
