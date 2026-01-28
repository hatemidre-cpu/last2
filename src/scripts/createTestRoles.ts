import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const password = await bcrypt.hash('password123', 10);

    const roles = ['editor', 'support', 'analyst'];

    for (const role of roles) {
        const email = `${role}@glamourglow.com`;
        const existing = await prisma.user.findUnique({ where: { email } });

        if (!existing) {
            await prisma.user.create({
                data: {
                    name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
                    email,
                    password,
                    role,
                    phone: '1234567890'
                }
            });
            console.log(`Created ${role} user: ${email}`);
        } else {
            console.log(`Updated ${role} user role`);
            await prisma.user.update({
                where: { email },
                data: { role }
            });
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
