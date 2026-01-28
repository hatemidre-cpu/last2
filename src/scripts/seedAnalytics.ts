import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding analytics data...');

    // 1. Create Users with different behaviors
    const password = await bcrypt.hash('password123', 10);

    const userTypes = [
        { count: 5, type: 'Champions', orders: 15, avgValue: 150, recency: 5 }, // High value, frequent, recent
        { count: 10, type: 'Loyal', orders: 8, avgValue: 80, recency: 15 },    // Med value, frequent, recent-ish
        { count: 20, type: 'Regular', orders: 3, avgValue: 50, recency: 45 },  // Avg value, occasional
        { count: 15, type: 'New', orders: 1, avgValue: 60, recency: 2 },       // New customers
        { count: 10, type: 'At Risk', orders: 6, avgValue: 90, recency: 100 }, // Good value, but haven't bought lately
        { count: 5, type: 'Lost', orders: 2, avgValue: 40, recency: 200 }      // Low value, long gone
    ];

    console.log('Creating users and orders...');

    for (const type of userTypes) {
        for (let i = 0; i < type.count; i++) {
            const email = `${type.type.toLowerCase().replace(' ', '')}${i + 1}@example.com`;

            // Check if user exists
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                console.log(`User ${email} already exists, skipping...`);
                continue;
            }

            const user = await prisma.user.create({
                data: {
                    name: `${type.type} Customer ${i + 1}`,
                    email,
                    password,
                    role: 'user',
                    phone: `555-01${Math.floor(Math.random() * 99)}`,
                }
            });

            // Create orders for this user
            for (let j = 0; j < type.orders; j++) {
                // Calculate date based on recency and frequency
                const daysAgo = type.recency + (j * (365 / type.orders)); // Spread orders over a year
                const date = new Date();
                date.setDate(date.getDate() - daysAgo);

                // Add some randomness to value
                const value = type.avgValue * (0.8 + Math.random() * 0.4);

                await prisma.order.create({
                    data: {
                        userId: user.id,
                        total: value,
                        status: 'delivered',
                        createdAt: date,
                        updatedAt: date,
                        items: JSON.stringify([
                            {
                                productId: 'placeholder',
                                name: 'Mock Product',
                                price: value,
                                quantity: 1,
                                image: 'https://via.placeholder.com/150'
                            }
                        ])
                    }
                });
            }
        }
    }

    // 2. Create Traffic Logs (Last 30 days)
    console.log('Generating traffic logs...');
    const paths = ['/', '/shop', '/product/1', '/cart', '/checkout', '/blog'];
    const events = ['page_view', 'page_view', 'page_view', 'user_action', 'website_exit'];

    for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        // More traffic on recent days
        const dailyVisits = Math.floor(50 + Math.random() * 100 + (30 - i) * 2);

        for (let j = 0; j < dailyVisits; j++) {
            const eventDate = new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000);

            await prisma.analyticsLog.create({
                data: {
                    event: events[Math.floor(Math.random() * events.length)],
                    path: paths[Math.floor(Math.random() * paths.length)],
                    ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                    userAgent: 'Mozilla/5.0 (Mock Agent)',
                    method: 'GET',
                    createdAt: eventDate
                }
            });
        }
    }

    console.log('✅ Seed complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
