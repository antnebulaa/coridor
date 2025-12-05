import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Deleting all messages...");
        await prisma.message.deleteMany();

        console.log("Deleting all conversations...");
        await prisma.conversation.deleteMany();

        console.log("Successfully reset all messages and conversations.");
    } catch (error) {
        console.error("Error resetting messages:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
