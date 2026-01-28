import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
    // Makeup
    {
        name: "Velvet Matte Lipstick",
        brand: "LuxeBeauty",
        description: "Long-lasting matte lipstick with a creamy texture.",
        price: 24.99,
        category: "Makeup",
        image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&q=80",
        bgColor: "#FFE4E1",
        inStock: true
    },
    {
        name: "Radiant Liquid Foundation",
        brand: "GlowUp",
        description: "Full coverage foundation for a flawless finish.",
        price: 35.00,
        category: "Makeup",
        image: "https://images.unsplash.com/photo-1599305090598-fe179d501227?w=800&q=80",
        bgColor: "#F5DEB3",
        inStock: true
    },
    {
        name: "Volumizing Mascara",
        brand: "EyeDef",
        description: "Intense black mascara for dramatic volume.",
        price: 18.50,
        category: "Makeup",
        image: "https://images.unsplash.com/photo-1631214500115-598fc2cb8d2d?w=800&q=80",
        bgColor: "#E6E6FA",
        inStock: true
    },
    {
        name: "Eyeshadow Palette - Sunset",
        brand: "ColorPop",
        description: "12 warm-toned shades for day and night looks.",
        price: 45.00,
        category: "Makeup",
        image: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&q=80",
        bgColor: "#FFDAB9",
        inStock: true
    },

    // Skin Care
    {
        name: "Hydrating Hyaluronic Serum",
        brand: "PureSkin",
        description: "Deep hydration for plump, glowing skin.",
        price: 42.00,
        category: "Skin Care",
        image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80",
        bgColor: "#E0FFFF",
        inStock: true
    },
    {
        name: "Vitamin C Brightening Cream",
        brand: "Radiance",
        description: "Daily moisturizer to even skin tone and boost radiance.",
        price: 38.00,
        category: "Skin Care",
        image: "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=800&q=80",
        bgColor: "#FFFACD",
        inStock: true
    },
    {
        name: "Gentle Foaming Cleanser",
        brand: "CleanFace",
        description: "Removes impurities without stripping natural oils.",
        price: 22.00,
        category: "Skin Care",
        image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80",
        bgColor: "#F0FFF0",
        inStock: true
    },

    // Hair Care
    {
        name: "Argan Oil Repair Shampoo",
        brand: "SilkStrands",
        description: "Restores shine and strength to damaged hair.",
        price: 26.00,
        category: "Hair Care",
        image: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=800&q=80",
        bgColor: "#FFF5EE",
        inStock: true
    },
    {
        name: "Keratin Smooth Conditioner",
        brand: "SilkStrands",
        description: "Frizz-free finish for silky smooth hair.",
        price: 26.00,
        category: "Hair Care",
        image: "https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=800&q=80",
        bgColor: "#F0F8FF",
        inStock: true
    },
    {
        name: "Heat Protection Spray",
        brand: "StyleSafe",
        description: "Shields hair from styling damage up to 450°F.",
        price: 19.50,
        category: "Hair Care",
        image: "https://images.unsplash.com/photo-1624456734268-07f1d4d392f6?w=800&q=80",
        bgColor: "#FFE4B5",
        inStock: true
    },

    // Fragrance
    {
        name: "Midnight Bloom Eau de Parfum",
        brand: "ScentCo",
        description: "A mysterious blend of jasmine, vanilla, and musk.",
        price: 85.00,
        category: "Fragrance",
        image: "https://images.unsplash.com/photo-1594035910387-fea4779426e9?w=800&q=80",
        bgColor: "#D8BFD8",
        inStock: true
    },
    {
        name: "Citrus Breeze Cologne",
        brand: "FreshAir",
        description: "Fresh notes of lemon, bergamot, and sea salt.",
        price: 75.00,
        category: "Fragrance",
        image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=80",
        bgColor: "#E0FFFF",
        inStock: true
    },

    // Bath & Body
    {
        name: "Lavender Relaxing Body Wash",
        brand: "Sooth",
        description: "Calming scent for a peaceful shower experience.",
        price: 16.00,
        category: "Bath & Body",
        image: "https://images.unsplash.com/photo-1608248597279-f99d160bfbc8?w=800&q=80",
        bgColor: "#E6E6FA",
        inStock: true
    },
    {
        name: "Shea Butter Body Lotion",
        brand: "Nourish",
        description: "Intense moisture for dry skin.",
        price: 20.00,
        category: "Bath & Body",
        image: "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=800&q=80",
        bgColor: "#FAFAD2",
        inStock: true
    },

    // Tools
    {
        name: "Professional Makeup Brush Set",
        brand: "ProTools",
        description: "12-piece set for face and eye application.",
        price: 55.00,
        category: "Tools",
        image: "https://images.unsplash.com/photo-1596462502278-27bfdd403348?w=800&q=80",
        bgColor: "#F5F5F5",
        inStock: true
    },
    {
        name: "Rose Quartz Facial Roller",
        brand: "GlowTools",
        description: "Reduces puffiness and promotes circulation.",
        price: 28.00,
        category: "Tools",
        image: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800&q=80",
        bgColor: "#FFC0CB",
        inStock: true
    }
];

async function main() {
    console.log('Start seeding products...');

    // Optional: Clear existing products
    // await prisma.product.deleteMany();

    for (const product of products) {
        await prisma.product.create({
            data: product,
        });
    }

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
