
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting VisitSlot restore...');

    const backupPath = path.join(process.cwd(), 'scripts', 'slots_backup.json');

    if (!fs.existsSync(backupPath)) {
        console.error('Backup file not found at:', backupPath);
        process.exit(1);
    }

    const rawData = fs.readFileSync(backupPath, 'utf8');
    const slots = JSON.parse(rawData);

    console.log(`Found ${slots.length} slots to restore.`);

    let successCount = 0;
    let errorCount = 0;

    for (const slot of slots) {
        try {
            await prisma.visitSlot.create({
                data: {
                    // Map fields from backup to new schema
                    userId: slot.userId,
                    date: new Date(slot.date), // Ensure date is Date object
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    latitude: slot.latitude || 0, // Fallback if missing (shouldn't be)
                    longitude: slot.longitude || 0,
                    address: slot.address,
                    radius: 200 // Default radius
                }
            });
            successCount++;
        } catch (e) {
            console.error(`Failed to restore slot ${slot.id}:`, e);
            errorCount++;
        }
    }

    console.log(`Restore complete. Success: ${successCount}, Failures: ${errorCount}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
