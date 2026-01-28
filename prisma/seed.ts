import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const products = [
    {
        name: "Midnight Recovery Concentrate",
        brand: "Luminary",
        price: 52.00,
        category: "Skin Care",
        description: "A replenishing nighttime facial oil that visibly restores the appearance of skin.",
        image: "",
        bgColor: "bg-indigo-900",
        inStock: true
    },
    {
        name: "Velvet Blur Lipstick - Ruby",
        brand: "Rouge",
        price: 32.00,
        category: "Makeup",
        description: "A soft-matte lipstick that delivers a blur of color with a weightless feel.",
        image: "",
        bgColor: "bg-red-500",
        inStock: true
    },
    {
        name: "Hydra-Gel Eye Cream",
        brand: "AquaVie",
        price: 45.00,
        category: "Skin Care",
        description: "A lightweight eye cream that hydrates and reduces the look of puffiness.",
        image: "",
        bgColor: "bg-cyan-100",
        inStock: true
    },
    {
        name: "Radiance Boosting Face Mask",
        brand: "GlowUp",
        price: 28.00,
        category: "Skin Care",
        description: "A brightening face mask to instantly revitalize dull and tired skin.",
        image: "",
        bgColor: "bg-yellow-100",
        inStock: true
    },
    {
        name: "Volumizing Mascara - Black",
        brand: "LashOut",
        price: 24.00,
        category: "Makeup",
        description: "Intense black mascara for maximum volume and length without clumps.",
        image: "",
        bgColor: "bg-gray-900",
        inStock: true
    },
    {
        name: "Daily Defense SPF 50",
        brand: "SunGuard",
        price: 38.00,
        category: "Skin Care",
        description: "Broad-spectrum SPF 50 moisturizer that protects and hydrates.",
        image: "",
        bgColor: "bg-orange-50",
        inStock: true
    },
    {
        name: "Exfoliating Glow Toner",
        brand: "PureSkin",
        price: 30.00,
        category: "Skin Care",
        description: "Gentle exfoliating toner with AHA to refine texture and boost radiance.",
        image: "",
        bgColor: "bg-pink-100",
        inStock: true
    },
    {
        name: "Liquid Blush - Peachy Pink",
        brand: "Cheeky",
        price: 26.00,
        category: "Makeup",
        description: "A lightweight liquid blush for a soft, natural-looking flush.",
        image: "",
        bgColor: "bg-rose-200",
        inStock: true
    },
    {
        name: "Hyaluronic Acid Serum",
        brand: "DermaLab",
        price: 48.00,
        category: "Skin Care",
        description: "Intense hydration serum with pure hyaluronic acid for plump skin.",
        image: "",
        bgColor: "bg-blue-50",
        inStock: true
    },
    {
        name: "Translucent Setting Powder",
        brand: "FinishLine",
        price: 34.00,
        category: "Makeup",
        description: "Silky loose powder to lock in makeup and control shine all day.",
        image: "",
        bgColor: "bg-stone-100",
        inStock: true
    }
];

const vouchers = [
    { code: 'WELCOME10', amount: 10, expiresAt: new Date('2025-12-31') },
    { code: 'BEAUTY20', amount: 20, expiresAt: new Date('2025-12-31') },
    { code: 'GLOW50', amount: 50, expiresAt: new Date('2025-12-31') },
    { code: 'VIP100', amount: 100, expiresAt: new Date('2025-12-31') },
];

async function main() {
    console.log('🌱 Starting database seed...');

    // Clear existing data
    // Note: Deleting in order to respect foreign key constraints if any, though prisma sometimes handles this with method specific like deleteMany
    // Transaction usually better for clean slate
    await prisma.transaction.deleteMany();
    await prisma.voucher.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    console.log('✅ Cleared existing data');

    // Seed products
    for (const product of products) {
        await prisma.product.create({
            data: product,
        });
    }
    console.log(`✅ Created ${products.length} products`);

    // Seed vouchers
    for (const voucher of vouchers) {
        await prisma.voucher.create({
            data: voucher,
        });
    }
    console.log(`✅ Created ${vouchers.length} vouchers`);

    // Seed Admin User
    const adminEmail = 'admin@glamourglow.com';
    const adminPasswordPlain = 'admin123';
    const hashedPassword = await bcrypt.hash(adminPasswordPlain, 10);

    const adminUser = await prisma.user.create({
        data: {
            name: "Admin User",
            email: adminEmail,
            password: hashedPassword,
            role: "admin",
            phone: "",
            balance: 0,
            address: "123 Admin St",
            city: "Admin City",
            country: "Techland",
            zipCode: "00000"
        }
    });

    console.log(`✅ Created Admin User: ${adminUser.email}`);

    console.log('🎉 Database seeded successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

