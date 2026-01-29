import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLeases() {
    try {
        console.log("Checking Rental Applications...");

        const applications = await prisma.rentalApplication.findMany({
            include: {
                listing: true,
                candidateScope: {
                    include: {
                        creatorUser: true
                    }
                },
                financials: true
            }
        });

        console.log(`Found ${applications.length} applications total.`);

        applications.forEach(app => {
            console.log(`--- Application ${app.id} ---`);
            console.log(`Status: ${app.status}`);
            console.log(`Lease Status: ${app.leaseStatus}`);
            console.log(`Listing ID: ${app.listingId}`);
            console.log(`Candidate: ${app.candidateScope?.creatorUser?.email}`);
            console.log(`Financials count: ${app.financials?.length}`);
            if (app.financials?.length) {
                app.financials.forEach(f => {
                    console.log(`  - Financial: Base=${f.baseRentCents}, Start=${f.startDate.toISOString()}`);
                });
            }
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkLeases();
