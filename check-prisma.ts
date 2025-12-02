import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking Prisma Client...');

    if (!prisma.visitSlot) {
        console.error('ERROR: prisma.visitSlot is undefined!');
        console.log('Available models:', Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')));
    } else {
        console.log('SUCCESS: prisma.visitSlot exists.');
        try {
            const count = await prisma.visitSlot.count();
            console.log('Current visitSlot count:', count);
        } catch (e) {
            console.error('Error querying visitSlot:', e);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
