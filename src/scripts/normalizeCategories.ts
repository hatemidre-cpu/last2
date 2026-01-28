import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const mappings: Record<string, string> = {
    'Skincare': 'Skin Care',
    'Haircare': 'Hair Care',
    'Perfumes': 'Fragrance',
    'Face': 'Makeup',
    'Lips': 'Makeup',
    'Eyes': 'Makeup'
};

async function main() {
    for (const [oldCat, newCat] of Object.entries(mappings)) {
        const result = await prisma.product.updateMany({
            where: { category: oldCat },
            data: { category: newCat }
        });
        console.log(`Updated ${result.count} products from '${oldCat}' to '${newCat}'`);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
