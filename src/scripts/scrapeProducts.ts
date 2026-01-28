import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface ProductData {
    name: string;
    brand: string;
    price: number;
    category: string;
    description: string;
    image: string;
    colors?: string[];
    sizes?: string[];
}

async function scrapeProducts() {
    console.log('🔍 Fetching cosmetics products...\n');

    try {
        // Using Makeup API - free public API for cosmetics data
        const response = await axios.get('https://makeup-api.herokuapp.com/api/v1/products.json');

        const products = response.data.slice(0, 50); // Get first 50 products
        console.log(`✅ Found ${products.length} products\n`);

        let created = 0;
        let skipped = 0;

        for (const product of products) {
            try {
                // Check if product already exists
                const existing = await prisma.product.findFirst({
                    where: {
                        name: product.name,
                        brand: product.brand
                    }
                });

                if (existing) {
                    skipped++;
                    continue;
                }

                // Map product type to category
                const categoryMap: { [key: string]: string } = {
                    'lipstick': 'Lips',
                    'foundation': 'Face',
                    'eyeshadow': 'Eyes',
                    'mascara': 'Eyes',
                    'blush': 'Face',
                    'eyeliner': 'Eyes',
                    'bronzer': 'Face',
                    'nail_polish': 'Nails'
                };

                const category = categoryMap[product.product_type] || 'Other';

                // Extract colors if available
                const colors = product.product_colors?.map((c: any) => c.hex_value).filter(Boolean) || [];

                // Generate random stock quantity
                const stock = Math.floor(Math.random() * 100) + 20;

                // Create product
                await prisma.product.create({
                    data: {
                        name: product.name || 'Unnamed Product',
                        brand: product.brand || 'Unknown Brand',
                        price: parseFloat(product.price) || 19.99,
                        category: category,
                        description: product.description || `${product.name} by ${product.brand}. High-quality cosmetic product.`,
                        image: product.image_link || 'https://via.placeholder.com/400x400?text=No+Image',
                        images: JSON.stringify([product.image_link]),
                        bgColor: '#f0f0f0',
                        colors: colors.length > 0 ? JSON.stringify(colors) : null,
                        sizes: null,
                        inStock: true
                    }
                });

                created++;
                console.log(`✅ Added: ${product.name} by ${product.brand} - $${product.price}`);

            } catch (error: any) {
                console.error(`❌ Error adding ${product.name}:`, error.message);
            }
        }

        console.log(`\n📊 Summary:`);
        console.log(`   ✅ Created: ${created} products`);
        console.log(`   ⏭️  Skipped: ${skipped} products (already exist)`);
        console.log(`   📦 Total in database: ${created + skipped} products\n`);

    } catch (error: any) {
        console.error('❌ Error fetching products:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the scraper
scrapeProducts()
    .then(() => {
        console.log('✅ Scraping completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
