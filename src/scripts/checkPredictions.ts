
import { inventoryService } from '../services/inventoryService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking inventory predictions...');

    try {
        const predictions = await inventoryService.getInventoryPredictions();
        console.log(`Found ${predictions.length} products with predictions.`);

        if (predictions.length > 0) {
            console.log('Top 3 critical/high risk items:');
            predictions.slice(0, 3).forEach(p => {
                console.log(`- ${p.name}: Stock ${p.stock}, Velocity ${p.dailyVelocity}/day, Days Remaining: ${p.daysRemaining} (${p.riskLevel})`);
            });
        } else {
            console.log('No predictions found. Ensure orders exist.');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
