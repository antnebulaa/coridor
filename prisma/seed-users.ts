import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const firstNames = ['Pierre', 'Paul', 'Jacques', 'Marie', 'Sophie', 'Julie', 'Thomas', 'Nicolas', 'Lucas', 'Emma', 'Alice', 'Chloé', 'Léa', 'Manon', 'Camille', 'Antoine', 'Julien', 'Benoit', 'David', 'Laura'];
const lastNames = ['Martin', 'Bernard', 'Thomas', 'Petit', 'Robert', 'Richard', 'Durand', 'Dubois', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Lefebvre', 'Leroy', 'Roux', 'David', 'Bertrand', 'Morel', 'Fournier', 'Girard'];

async function main() {
    const password = await bcrypt.hash('password123', 12);

    console.log('Seeding 20 users...');

    for (let i = 0; i < 20; i++) {
        // Pick specific names if i < length, else random
        const firstName = i < firstNames.length ? firstNames[i] : firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = i < lastNames.length ? lastNames[i] : lastNames[Math.floor(Math.random() * lastNames.length)];

        // Ensure email uniqueness more robustly
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@example.com`;

        try {
            await prisma.user.create({
                data: {
                    name: `${firstName} ${lastName}`,
                    firstName,
                    lastName,
                    email,
                    hashedPassword: password,
                    emailVerified: new Date(),
                    image: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random`,
                    userMode: 'TENANT',
                    plan: 'FREE',
                }
            });
            console.log(`Created user ${email}`);
        } catch (error) {
            console.error(`Failed to create user ${email}:`, error);
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
