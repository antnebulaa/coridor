
import prisma from "../libs/prismadb";

async function fixData() {
    // Find all units named "Principal" and set type to ENTIRE_PLACE if not already
    const updates = await prisma.rentalUnit.updateMany({
        where: {
            name: "Principal"
        },
        data: {
            type: "ENTIRE_PLACE"
        }
    });

    console.log(`Updated ${updates.count} units to ENTIRE_PLACE`);
}

fixData()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
