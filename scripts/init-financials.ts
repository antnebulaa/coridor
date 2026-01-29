
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting LeaseFinancials initialization...");

    try {
        const applications = await prisma.rentalApplication.findMany({
            where: {
                OR: [
                    { leaseStatus: 'SIGNED' },
                    { leaseStatus: 'PENDING_SIGNATURE' }
                ]
            },
            include: {
                listing: true,
                candidateScope: true,
                financials: true // Try inclusion
            }
        });

        console.log(`Found ${applications.length} signed/pending applications.`);
        let createdCount = 0;

        for (const app of applications) {
            // Check if already has financials
            if (app.financials && app.financials.length > 0) {
                console.log(`Skipping App ${app.id} - Already has financials.`);
                continue;
            }

            const listing = app.listing;

            // Extract Charges
            let chargesAmount = 0;
            if (listing.charges) {
                const charges: any = listing.charges;
                if (typeof charges === 'number') {
                    chargesAmount = charges;
                } else if (typeof charges === 'object') {
                    chargesAmount = Number(charges.amount || charges.value || 0);
                }
            }

            // Determine Start Date
            const startDate = app.candidateScope.targetMoveInDate || app.appliedAt || new Date();

            console.log(`Initializing App ${app.id} with Rent: ${listing.price}, Charges: ${chargesAmount}`);

            await prisma.leaseFinancials.create({
                data: {
                    rentalApplicationId: app.id,
                    baseRentCents: listing.price * 100, // Euros to Cents
                    serviceChargesCents: Math.round(chargesAmount * 100),
                    startDate: startDate
                }
            });
            createdCount++;
        }

        console.log(`Success! Created ${createdCount} LeaseFinancials records.`);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
