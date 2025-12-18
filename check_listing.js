
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLatestListing() {
    try {
        const listing = await prisma.listing.findFirst({
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (!listing) {
            console.log("No listing found.");
            return;
        }

        console.log("=== LATEST LISTING DEBUG ===");
        console.log(`ID: ${listing.id}`);
        console.log(`Title: ${listing.title}`);
        console.log(`Surface: ${listing.surface}`);
        console.log(`DPE: '${listing.dpe}'`);
        console.log(`GES: '${listing.ges}'`);
        console.log(`Heating: ${listing.heatingSystem}`);
        console.log(`Energy Cost Min: ${listing.energy_cost_min}`);
        console.log(`Energy Cost Max: ${listing.energy_cost_max}`);
        console.log(`DPE Year: ${listing.dpe_year}`);
        console.log("============================");

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkLatestListing();
