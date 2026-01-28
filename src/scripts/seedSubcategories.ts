import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const subcategoryKeywords: Record<string, Record<string, string[]>> = {
    'Makeup': {
        'Face': ['foundation', 'concealer', 'blush', 'powder', 'primer', 'bronzer', 'face'],
        'Eyes': ['mascara', 'eyeliner', 'shadow', 'brow', 'palette', 'eye'],
        'Lips': ['lipstick', 'gloss', 'balm', 'liner', 'stain', 'lip'],
        'Cheeks': ['highlighter', 'cheek']
    },
    'Skin Care': {
        'Moisturizers': ['cream', 'lotion', 'moisturizer', 'gel', 'hydration'],
        'Cleansers': ['wash', 'cleanser', 'soap', 'scrub', 'exfoliator'],
        'Serums': ['serum', 'oil', 'treatment', 'essence', 'ampoule'],
        'Masks': ['mask', 'sheet', 'clay']
    },
    'Hair Care': {
        'Shampoo & Conditioner': ['shampoo', 'conditioner', 'wash'],
        'Styling': ['spray', 'gel', 'mousse', 'wax', 'pomade'],
        'Treatments': ['oil', 'mask', 'repair']
    },
    'Fragrance': {
        'Women': ['parfum', 'woman', 'her', 'lady'],
        'Men': ['cologne', 'man', 'him', 'homme'],
        'Unisex': ['unisex', 'eau de']
    }
};

async function main() {
    const products = await prisma.product.findMany();

    for (const product of products) {
        let subcategory: string | null = null;
        const name = product.name.toLowerCase();
        const desc = product.description.toLowerCase();
        const category = product.category;

        if (subcategoryKeywords[category]) {
            for (const [sub, keywords] of Object.entries(subcategoryKeywords[category])) {
                if (keywords.some(k => name.includes(k) || desc.includes(k))) {
                    subcategory = sub;
                    break;
                }
            }
            // Default if no keyword match
            if (!subcategory) {
                subcategory = Object.keys(subcategoryKeywords[category])[0]; // Assign to first subcategory as fallback
            }
        }

        if (subcategory) {
            await prisma.product.update({
                where: { id: product.id },
                data: { subcategory }
            });
            console.log(`Updated ${product.name} -> ${category} / ${subcategory}`);
        }
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
