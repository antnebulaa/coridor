
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting debug script (Standalone)...");

    // 1. Fetch any listing to test
    const listing = await prisma.listing.findFirst({
        include: {
            rentalUnit: {
                include: {
                    property: {
                        include: {
                            rentalUnits: true
                        }
                    }
                }
            }
        }
    });

    if (!listing) {
        console.log("No listing found.");
        return;
    }

    console.log(`Found listing: ${listing.id}`);

    // Check if rentalUnit exists
    if (!listing.rentalUnit) {
        console.log("Listing has no rentalUnit.");
        return;
    }

    const property = listing.rentalUnit.property;
    if (!property) {
        console.log("RentalUnit has no property.");
        return;
    }

    console.log("Property ID:", property.id);

    const unit = listing.rentalUnit;

    try {
        console.log(`Attempting to update isActive for unit ${unit.id}...`);

        // TypeScript might complain if types aren't generated, but runtime will throw if column missing
        await prisma.rentalUnit.update({
            where: { id: unit.id },
            data: { isActive: true }
        });
        console.log("Update SUCCESS! isActive field exists and works.");
    } catch (error) {
        console.error("Update FAILED:");
        console.error(error);
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
