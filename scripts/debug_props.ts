const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDb() {
    const properties = await prisma.property.findMany({
        select: {
            id: true,
            address: true,
            addressLine1: true,
            city: true,
            zipCode: true,
            building: true,
            apartment: true,
        }
    });

    console.log("PROPERTIES DEBUG:");
    properties.forEach((p: any) => {
        console.log(`ID: ${p.id}`);
        console.log(`  Address:  "${p.address}"`);
        console.log(`  Address1: "${p.addressLine1}"`);
        console.log(`  Bâtiment: "${p.building}"`);
        console.log(`  Appart:   "${p.apartment}"`);
        console.log("-------------------");
    });
}

checkDb()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
