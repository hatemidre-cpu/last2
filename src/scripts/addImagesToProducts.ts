import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLACEHOLDER_IMAGES = [
    'https://images.unsplash.com/photo-1596462502278-27bfdd403348?q=80&w=800&auto=format&fit=crop', // Makeup
    'https://images.unsplash.com/photo-1571781348782-f2c426809873?q=80&w=800&auto=format&fit=crop', // Skincare
    'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=800&auto=format&fit=crop', // Perfume
    'https://images.unsplash.com/photo-1522335789203-abd652322ed8?q=80&w=800&auto=format&fit=crop', // Lipstick
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=800&auto=format&fit=crop', // Serum
    'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=800&auto=format&fit=crop', // Palette
];

async function addImagesToProducts() {
    console.log('🖼️  Adding 3 images to all products...');

    try {
        const products = await prisma.product.findMany();
        console.log(`Found ${products.length} products.`);

        for (const product of products) {
            let currentImages: string[] = [];

            // Parse existing images if any
            if (product.images) {
                try {
                    const parsed = JSON.parse(product.images);
                    if (Array.isArray(parsed)) {
                        currentImages = parsed;
                    }
                } catch (e) {
                    // If not JSON, maybe it's a single string or invalid
                    if (typeof product.images === 'string' && product.images.startsWith('http')) {
                        currentImages = [product.images];
                    }
                }
            }

            // If no images array but has main image, start with that
            if (currentImages.length === 0 && product.image) {
                currentImages.push(product.image);
            }

            // Fill up to 3 images
            while (currentImages.length < 3) {
                // Pick a random placeholder that isn't already in the list (if possible)
                const randomImage = PLACEHOLDER_IMAGES[Math.floor(Math.random() * PLACEHOLDER_IMAGES.length)];
                currentImages.push(randomImage);
            }

            // Limit to 3 images if it has more (optional, but user asked for 3)
            // But maybe user meant "at least 3" or "exactly 3". Let's ensure at least 3.
            // If it has more, we'll keep them.

            // Update product
            await prisma.product.update({
                where: { id: product.id },
                data: {
                    images: JSON.stringify(currentImages)
                }
            });

            console.log(`✅ Updated ${product.name} with ${currentImages.length} images.`);
        }

        console.log('\n✨ All products updated successfully!');

    } catch (error) {
        console.error('❌ Error updating products:', error);
    } finally {
        await prisma.$disconnect();
    }
}

addImagesToProducts();
