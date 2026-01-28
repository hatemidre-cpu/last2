import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const initialCategories = [
    { name: 'Makeup', subcategories: ['Face', 'Eyes', 'Lips', 'Cheeks'], order: 0 },
    { name: 'Skin Care', subcategories: ['Moisturizers', 'Cleansers', 'Serums', 'Masks'], order: 1 },
    { name: 'Hair Care', subcategories: ['Shampoo & Conditioner', 'Styling', 'Treatments'], order: 2 },
    { name: 'Fragrance', subcategories: ['Women', 'Men', 'Unisex'], order: 3 },
    { name: 'Bath & Body', subcategories: ['Body Wash', 'Lotions', 'Scrubs'], order: 4 },
    { name: 'Tools', subcategories: ['Brushes', 'Sponges', 'Accessories'], order: 5 },
    { name: 'Men', subcategories: ['Skincare', 'Shaving', 'Fragrance'], order: 6 },
    { name: 'Gifts', subcategories: ['Sets', 'Cards'], order: 7 },
];

async function seedCategories() {
    console.log('Seeding categories...');

    for (const category of initialCategories) {
        const existing = await prisma.category.findUnique({
            where: { name: category.name }
        });

        if (existing) {
            console.log(`Category "${category.name}" already exists, skipping...`);
            continue;
        }

        await prisma.category.create({
            data: {
                name: category.name,
                subcategories: category.subcategories,
                order: category.order,
                isActive: true,
            }
        });

        console.log(`✓ Created category: ${category.name}`);
    }

    console.log('✓ Categories seeded successfully!');
    await prisma.$disconnect();
}

seedCategories().catch((error) => {
    console.error('Error seeding categories:', error);
    process.exit(1);
});
