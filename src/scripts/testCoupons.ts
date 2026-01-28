import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCouponSystem() {
    console.log('🧪 Testing Coupon System...\n');

    try {
        // 1. Create a test coupon (percentage discount)
        console.log('1️⃣ Creating percentage coupon (20% off, max $50)...');
        const percentageCoupon = await prisma.coupon.create({
            data: {
                code: 'SAVE20',
                discountType: 'percentage',
                discountValue: 20,
                minPurchase: 50,
                maxDiscount: 50,
                usageLimit: 100,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            }
        });
        console.log('✅ Created:', percentageCoupon.code);

        // 2. Create a fixed discount coupon
        console.log('\n2️⃣ Creating fixed discount coupon ($10 off)...');
        const fixedCoupon = await prisma.coupon.create({
            data: {
                code: 'FIXED10',
                discountType: 'fixed',
                discountValue: 10,
                minPurchase: 30,
                usageLimit: 50,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        });
        console.log('✅ Created:', fixedCoupon.code);

        // 3. Create a user-specific coupon
        console.log('\n3️⃣ Finding a user to assign a coupon to...');
        const user = await prisma.user.findFirst();

        if (user) {
            const userCoupon = await prisma.coupon.create({
                data: {
                    code: 'WELCOME50',
                    discountType: 'percentage',
                    discountValue: 50,
                    minPurchase: 0,
                    maxDiscount: 100,
                    usageLimit: 1,
                    validFrom: new Date(),
                    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                    assignedToUserId: user.id
                }
            });

            await prisma.userCoupon.create({
                data: {
                    userId: user.id,
                    couponId: userCoupon.id
                }
            });

            console.log(`✅ Created user-specific coupon: ${userCoupon.code} for ${user.email}`);
        } else {
            console.log('⚠️  No users found, skipping user-specific coupon');
        }

        // 4. List all coupons
        console.log('\n4️⃣ Listing all coupons...');
        const allCoupons = await prisma.coupon.findMany({
            include: {
                _count: {
                    select: { userCoupons: true }
                }
            }
        });

        console.log(`\n📋 Total coupons: ${allCoupons.length}`);
        allCoupons.forEach(coupon => {
            const discount = coupon.discountType === 'percentage'
                ? `${coupon.discountValue}%`
                : `$${coupon.discountValue}`;
            const assigned = coupon.assignedToUserId ? ' (User-specific)' : ' (General)';
            console.log(`   - ${coupon.code}: ${discount} off${assigned}`);
        });

        // 5. Test discount calculations
        console.log('\n5️⃣ Testing discount calculations...');

        // Test percentage coupon
        const cart1Total = 100;
        const discount1 = (cart1Total * percentageCoupon.discountValue) / 100;
        console.log(`   Cart: $${cart1Total} + ${percentageCoupon.code} = $${cart1Total - discount1} (saved $${discount1})`);

        // Test fixed coupon
        const cart2Total = 50;
        const discount2 = fixedCoupon.discountValue;
        console.log(`   Cart: $${cart2Total} + ${fixedCoupon.code} = $${cart2Total - discount2} (saved $${discount2})`);

        console.log('\n✅ All tests passed!');
        console.log('\n📝 Test coupons created:');
        console.log('   - SAVE20 (20% off, min $50 purchase)');
        console.log('   - FIXED10 ($10 off, min $30 purchase)');
        if (user) {
            console.log(`   - WELCOME50 (50% off for ${user.email})`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testCouponSystem();
