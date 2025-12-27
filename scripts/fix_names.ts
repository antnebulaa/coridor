
import prisma from "../libs/prismadb";

async function fixNames() {
    // Find all units linked to a room
    const units = await prisma.rentalUnit.findMany({
        where: {
            targetRoomId: { not: null }
        },
        include: {
            targetRoom: true
        }
    });

    for (const unit of units) {
        if (unit.targetRoom && unit.name === "Chambre") {
            await prisma.rentalUnit.update({
                where: { id: unit.id },
                data: { name: unit.targetRoom.name }
            });
            console.log(`Updated unit ${unit.id} to name ${unit.targetRoom.name}`);
        }
    }
}

fixNames()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
