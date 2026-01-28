import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCategories() {
    const categories = await prisma.product.findMany({
        select: { category: true, subcategory: true },
        distinct: ['category'],
    });

    console.log('Categories in database:');
    console.log(JSON.stringify(categories, null, 2));

    await prisma.$disconnect();
}

checkCategories();
