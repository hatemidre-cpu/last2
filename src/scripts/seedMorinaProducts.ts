import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Realistic cosmetics data inspired by Morina Shops
const morinaProducts = [
    // YSL Products
    { name: 'TOUCHE ÉCLAT LE TEINT Foundation', brand: 'YSL', price: 52.00, category: 'Makeup', description: 'Radiant foundation with SPF 22 for a flawless complexion' },
    { name: 'LASH CLASH EXTREME VOLUME MASCARA', brand: 'YSL', price: 35.00, category: 'Makeup', description: 'Extreme volume mascara for dramatic lashes' },
    { name: 'Rouge Pur Couture Lipstick', brand: 'YSL', price: 42.00, category: 'Makeup', description: 'Luxurious lipstick with intense color payoff' },
    { name: 'Black Opium Eau de Parfum', brand: 'YSL', price: 95.00, category: 'Perfumes', description: 'Addictive gourmand fragrance with coffee and vanilla notes' },

    // Lancôme Products
    { name: 'ADVANCED GÉNIFIQUE Youth Activating Serum', brand: 'Lancôme', price: 105.00, category: 'Skincare', description: 'Anti-aging serum for radiant, youthful skin' },
    { name: 'HYDRA ZEN GEL CREAM', brand: 'Lancôme', price: 58.00, category: 'Skincare', description: 'Hydrating gel cream for all skin types' },
    { name: 'Hypnôse Mascara', brand: 'Lancôme', price: 32.00, category: 'Makeup', description: 'Volumizing mascara for fuller lashes' },
    { name: 'La Vie Est Belle Eau de Parfum', brand: 'Lancôme', price: 98.00, category: 'Perfumes', description: 'Floral fragrance celebrating happiness' },

    // Giorgio Armani Products
    { name: 'Luminous Silk Foundation', brand: 'Giorgio Armani', price: 68.00, category: 'Makeup', description: 'Lightweight foundation for a natural glow' },
    { name: 'EMPORIO ARMANI Stronger With You Intensely', brand: 'Giorgio Armani', price: 92.00, category: 'Perfumes', description: 'Intense masculine fragrance' },
    { name: 'Acqua di Giò Eau de Toilette', brand: 'Giorgio Armani', price: 88.00, category: 'Perfumes', description: 'Fresh aquatic fragrance for men' },

    // Dolce & Gabbana Products
    { name: 'The Only One Eau de Parfum', brand: 'Dolce & Gabbana', price: 95.00, category: 'Perfumes', description: 'Feminine floral fragrance' },
    { name: 'Light Blue Eau de Toilette', brand: 'Dolce & Gabbana', price: 85.00, category: 'Perfumes', description: 'Fresh Mediterranean fragrance' },

    // L'Oréal Paris Products
    { name: 'Revitalift Laser X3 Day Cream', brand: 'L\'Oréal Paris', price: 28.00, category: 'Skincare', description: 'Anti-aging day cream with Pro-Xylane' },
    { name: 'Infallible 24H Foundation', brand: 'L\'Oréal Paris', price: 18.00, category: 'Makeup', description: 'Long-lasting full coverage foundation' },
    { name: 'Voluminous Lash Paradise Mascara', brand: 'L\'Oréal Paris', price: 12.00, category: 'Makeup', description: 'Volumizing mascara for fuller lashes' },

    // Clarins Products
    { name: 'Double Serum Complete Age Control', brand: 'Clarins', price: 95.00, category: 'Skincare', description: 'Anti-aging serum with 21 plant extracts' },
    { name: 'Hydra-Essentiel Cream', brand: 'Clarins', price: 52.00, category: 'Skincare', description: 'Hydrating cream for all skin types' },
    { name: 'Instant Light Lip Comfort Oil', brand: 'Clarins', price: 28.00, category: 'Makeup', description: 'Nourishing lip oil with shine' },

    // Kérastase Products
    { name: 'ELIXIR ULTIME L\'HUILE ORIGINALE', brand: 'Kérastase', price: 58.00, category: 'Haircare', description: 'Versatile hair oil for all hair types' },
    { name: 'Resistance Bain Force Architecte', brand: 'Kérastase', price: 35.00, category: 'Haircare', description: 'Strengthening shampoo for damaged hair' },
    { name: 'Nutritive Masquintense', brand: 'Kérastase', price: 65.00, category: 'Haircare', description: 'Intensive nourishing hair mask' },

    // Bourjois Products
    { name: 'Healthy Mix Foundation', brand: 'Bourjois', price: 16.00, category: 'Makeup', description: 'Radiant foundation with vitamins' },
    { name: 'Volume Glamour Mascara', brand: 'Bourjois', price: 12.00, category: 'Makeup', description: 'Volumizing mascara' },
    { name: 'Rouge Velvet Lipstick', brand: 'Bourjois', price: 14.00, category: 'Makeup', description: 'Matte liquid lipstick' },

    // Jimmy Choo Products
    { name: 'I WANT CHOO Eau de Parfum', brand: 'Jimmy Choo', price: 92.00, category: 'Perfumes', description: 'Seductive floral fragrance' },
    { name: 'Fever Eau de Parfum', brand: 'Jimmy Choo', price: 88.00, category: 'Perfumes', description: 'Sensual fragrance with plum and tonka bean' },

    // Jean Paul Gaultier Products
    { name: 'SCANDAL LE PARFUM Eau de Parfum Intense', brand: 'Jean Paul Gaultier', price: 98.00, category: 'Perfumes', description: 'Intense floral fragrance' },
    { name: 'Le Male Eau de Toilette', brand: 'Jean Paul Gaultier', price: 85.00, category: 'Perfumes', description: 'Iconic masculine fragrance' },

    // Elie Saab Products
    { name: 'L\'HOMME Eau de Parfum', brand: 'Elie Saab', price: 78.00, category: 'Perfumes', description: 'Elegant masculine fragrance' },
    { name: 'Le Parfum Eau de Parfum', brand: 'Elie Saab', price: 92.00, category: 'Perfumes', description: 'Luxurious floral fragrance' },

    // Additional Popular Products
    { name: 'MAKE ME BLUSH Powder Blush', brand: 'Bourjois', price: 14.00, category: 'Makeup', description: 'Natural-looking powder blush' },
    { name: 'ALL HOURS CONCEALER', brand: 'YSL', price: 35.00, category: 'Makeup', description: 'Long-lasting full coverage concealer' },
    { name: 'LOOSE POWDER', brand: 'YSL', price: 52.00, category: 'Makeup', description: 'Translucent setting powder' },
    { name: 'DE-PUFFING EYE SERUM', brand: 'Lancôme', price: 68.00, category: 'Skincare', description: 'Eye serum to reduce puffiness' },
    { name: 'RENERGIE C.R.X TRIPLE SERUM RETINOL', brand: 'Lancôme', price: 125.00, category: 'Skincare', description: 'Triple action anti-aging serum with retinol' }
];

async function seedMorinaProducts() {
    console.log('🌱 Seeding Morina Shops products...\n');

    let created = 0;
    let skipped = 0;

    for (const product of morinaProducts) {
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
                    image: `https://via.placeholder.com/400x400/f0f0f0/333?text=${encodeURIComponent(product.brand)}`,
                    images: JSON.stringify([`https://via.placeholder.com/400x400/f0f0f0/333?text=${encodeURIComponent(product.brand)}`]),
                    bgColor: '#f0f0f0',
                    colors: null,
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
    console.log(`   📦 Total: ${created + skipped} products\n`);

    await prisma.$disconnect();
}

// Run the seeder
seedMorinaProducts()
    .then(() => {
        console.log('✅ Seeding completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
