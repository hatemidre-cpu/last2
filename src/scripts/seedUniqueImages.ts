import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedUniqueImages() {
    console.log('🖼️  Seeding unique images for all products...');

    try {
        const products = await prisma.product.findMany();
        console.log(`Found ${products.length} products.`);

        for (const product of products) {
            const images: string[] = [];

            // Generate 3 unique images based on product ID to ensure consistency and uniqueness
            for (let i = 0; i < 3; i++) {
                // Using loremflickr with a lock based on product ID and index
                // This ensures the same product always gets the same "random" images
                // and different products get different images.
                // We use the product ID characters to generate a number for the lock
                const lockId = product.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + i * 1000;
                const imageUrl = `https://loremflickr.com/800/800/cosmetics,beauty,makeup?lock=${lockId}`;
                images.push(imageUrl);
            }

            // Update product
            await prisma.product.update({
                where: { id: product.id },
                data: {
                    image: images[0], // Set primary image
                    images: JSON.stringify(images)
                }
            });

            console.log(`✅ Updated ${product.name} with 3 unique images.`);
        }

        console.log('\n✨ All products updated with unique images!');

    } catch (error) {
        console.error('❌ Error updating products:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seedUniqueImages();
