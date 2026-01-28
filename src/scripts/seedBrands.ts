import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const brands = [
    {
        name: 'La Mer',
        logo: '<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg"><path d="M20,50 Q50,20 80,50 T140,50" stroke="white" fill="none" stroke-width="5"/><text x="100" y="80" font-family="serif" font-size="24" fill="white" text-anchor="middle">LA MER</text></svg>'
    },
    {
        name: 'Augustinus Bader',
        logo: '<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="30" stroke="white" stroke-width="3" fill="none"/><text x="100" y="60" font-family="sans-serif" font-size="20" fill="white">BADER</text></svg>'
    },
    {
        name: 'SkinCeuticals',
        logo: '<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="30" width="40" height="40" stroke="white" stroke-width="3" fill="none"/><text x="80" y="60" font-family="sans-serif" font-size="20" fill="white">SKINCEUTICALS</text></svg>'
    },
    {
        name: 'Sisley',
        logo: '<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg"><text x="100" y="60" font-family="serif" font-size="30" fill="white" text-anchor="middle" letter-spacing="5">SISLEY</text></svg>'
    },
    {
        name: 'Alastin',
        logo: '<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg"><path d="M50,80 L100,20 L150,80" stroke="white" stroke-width="3" fill="none"/><text x="100" y="95" font-family="sans-serif" font-size="16" fill="white" text-anchor="middle">ALASTIN</text></svg>'
    },
    {
        name: 'True Botanicals',
        logo: '<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="50" r="40" stroke="white" stroke-width="2" fill="none"/><text x="100" y="55" font-family="serif" font-size="14" fill="white" text-anchor="middle">TRUE BOTANICALS</text></svg>'
    },
    {
        name: 'Dr. Barbara Sturm',
        logo: '<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg"><text x="100" y="40" font-family="sans-serif" font-size="16" fill="white" text-anchor="middle">DR. BARBARA</text><text x="100" y="70" font-family="sans-serif" font-size="24" fill="white" text-anchor="middle" font-weight="bold">STURM</text></svg>'
    },
    {
        name: 'Vintner\'s Daughter',
        logo: '<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg"><text x="100" y="55" font-family="serif" font-size="18" fill="white" text-anchor="middle" font-style="italic">Vintner\'s Daughter</text></svg>'
    },
    {
        name: 'Caudalie',
        logo: '<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg"><path d="M80,50 Q100,20 120,50 Q100,80 80,50" stroke="white" stroke-width="3" fill="none"/><text x="100" y="90" font-family="serif" font-size="20" fill="white" text-anchor="middle">CAUDALIE</text></svg>'
    },
    {
        name: 'Biologique Recherche',
        logo: '<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg"><text x="100" y="45" font-family="serif" font-size="16" fill="white" text-anchor="middle">BIOLOGIQUE</text><text x="100" y="75" font-family="serif" font-size="16" fill="white" text-anchor="middle">RECHERCHE</text></svg>'
    }
];

async function seedBrands() {
    try {
        console.log('🌱 Seeding brands...');

        // Clear existing brands
        await prisma.brand.deleteMany();

        for (const brand of brands) {
            await prisma.brand.create({
                data: brand
            });
        }

        console.log('✅ Brands seeded successfully!');
    } catch (error) {
        console.error('❌ Error seeding brands:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seedBrands();
