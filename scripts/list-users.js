
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    console.log('--- Users ---');
    if (users.length === 0) {
        console.log('No users found in database.');
    } else {
        users.forEach(u => console.log(`- ${u.email} (${u.name || 'No Name'}) [${u.role}]`));
    }
    console.log('-------------');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
