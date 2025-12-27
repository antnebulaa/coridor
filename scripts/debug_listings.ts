
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting debug listings script...");

    // Fetch all properties with units and listings
    const properties = await prisma.property.findMany({
        include: {
            rentalUnits: {
                include: {
                    listings: true
                }
            }
        }
    });

    console.log(`Found ${properties.length} properties.`);

    for (const prop of properties) {
        console.log(`\nProperty: ${prop.address || prop.id} (Category: ${prop.category})`);

        for (const unit of prop.rentalUnits) {
            console.log(`  - Unit: ${unit.name} (Type: ${unit.type}) [isActive: ${unit.isActive}]`);
            console.log(`    Listings: ${unit.listings.length}`);
            unit.listings.forEach(l => {
                console.log(`      * Listing ID: ${l.id} | Title: ${l.title} | Status: ${l.status}`);
            });
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
