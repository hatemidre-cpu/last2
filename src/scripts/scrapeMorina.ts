import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

interface ProductData {
    name: string;
    brand: string;
    price: number;
    category: string;
    description: string;
    image: string;
    colors?: string[];
}

async function scrapeMorinaShops() {
    console.log('🔍 Scraping products from Morina Shops...\n');

    try {
        const categories = [
            { url: 'https://morinashops.com/en/19553-makeup', name: 'Makeup' },
            { url: 'https://morinashops.com/en/19552-skincare', name: 'Skincare' },
            { url: 'https://morinashops.com/en/3-perfumes', name: 'Perfumes' }
        ];

        let allProducts: ProductData[] = [];

        for (const category of categories) {
            try {
                console.log(`📦 Fetching ${category.name}...`);
                const response = await axios.get(category.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                const $ = cheerio.load(response.data);

                // Find product elements
                $('.product-miniature, .product, article[data-id-product]').each((index, element) => {
                    if (allProducts.length >= 100) return; // Limit total products

                    const $el = $(element);

                    // Extract product data
                    const name = $el.find('.product-title, h3, h2, .h3').first().text().trim();
                    const priceText = $el.find('.price, .product-price').first().text().trim();
                    const imageUrl = $el.find('img').first().attr('src') ||
                        $el.find('img').first().attr('data-src') ||
                        $el.find('img').first().attr('data-lazy-src');

                    if (name && priceText) {
                        // Extract price number (handle different formats)
                        const priceMatch = priceText.match(/[\d,]+\.?\d*/);
                        const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 29.99;

                        // Extract brand from name if possible
                        const brandMatch = name.match(/^([A-Z][A-Z\s&]+)/);
                        const brand = brandMatch ? brandMatch[1].trim() : 'Morina';

                        allProducts.push({
                            name: name,
                            brand: brand,
                            price: price > 0 ? price : 29.99,
                            category: category.name,
                            description: `${name} - Premium ${category.name.toLowerCase()} product from Morina Shops`,
                            image: imageUrl && imageUrl.startsWith('http') ? imageUrl : 'https://morinashops.com' + imageUrl,
                            colors: []
                        });
                    }
                });

                console.log(`  ✅ Found ${allProducts.filter(p => p.category === category.name).length} products in ${category.name}`);

                // Add delay between requests
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error: any) {
                console.error(`  ❌ Error fetching ${category.name}:`, error.message);
            }
        }

        console.log(`\n✅ Total products found: ${allProducts.length}\n`);

        let created = 0;
        let skipped = 0;

        for (const product of allProducts) {
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

                // Create product
                await prisma.product.create({
                    data: {
                        name: product.name,
                        brand: product.brand,
                        price: product.price,
                        category: product.category,
                        description: product.description,
                        image: product.image,
                        images: JSON.stringify([product.image]),
                        bgColor: '#f0f0f0',
                        colors: product.colors && product.colors.length > 0 ? JSON.stringify(product.colors) : null,
                        sizes: null,
                        inStock: true
                    }
                });

                created++;
                console.log(`✅ Added: ${product.name} - $${product.price}`);

            } catch (error: any) {
                console.error(`❌ Error adding ${product.name}:`, error.message);
            }
        }

        console.log(`\n📊 Summary:`);
        console.log(`   ✅ Created: ${created} products`);
        console.log(`   ⏭️  Skipped: ${skipped} products (already exist)`);
        console.log(`   📦 Total: ${created + skipped} products\n`);

    } catch (error: any) {
        console.error('❌ Error scraping Morina Shops:', error.message);
        console.log('\n💡 Note: Web scraping may be blocked. Consider using their API if available.');
    } finally {
        await prisma.$disconnect();
    }
}

// Run the scraper
scrapeMorinaShops()
    .then(() => {
        console.log('✅ Scraping completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
