
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const IRL_HISTORY = [
    { year: 2025, quarter: 3, value: 147.16, publishedAt: new Date("2025-10-15") },
    { year: 2025, quarter: 2, value: 146.23, publishedAt: new Date("2025-07-12") },
    { year: 2025, quarter: 1, value: 145.24, publishedAt: new Date("2025-04-12") },
    { year: 2024, quarter: 4, value: 144.50, publishedAt: new Date("2025-01-12") },
    { year: 2024, quarter: 3, value: 144.16, publishedAt: new Date("2024-10-15") },
    { year: 2024, quarter: 2, value: 143.23, publishedAt: new Date("2024-07-12") },
    { year: 2024, quarter: 1, value: 142.24, publishedAt: new Date("2024-04-12") },
    { year: 2023, quarter: 4, value: 141.03, publishedAt: new Date("2024-01-12") },
    { year: 2023, quarter: 3, value: 140.24, publishedAt: new Date("2023-10-13") },
    { year: 2023, quarter: 2, value: 139.39, publishedAt: new Date("2023-07-13") },
    { year: 2023, quarter: 1, value: 138.61, publishedAt: new Date("2023-04-14") },
    { year: 2022, quarter: 4, value: 137.26, publishedAt: new Date("2023-01-13") },
    { year: 2022, quarter: 3, value: 136.27, publishedAt: new Date("2022-10-14") },
    { year: 2022, quarter: 2, value: 135.84, publishedAt: new Date("2022-07-13") },
    { year: 2022, quarter: 1, value: 135.15, publishedAt: new Date("2022-04-15") },
    { year: 2021, quarter: 4, value: 134.96, publishedAt: new Date("2022-01-14") },
    { year: 2021, quarter: 3, value: 132.61, publishedAt: new Date("2021-10-15") },
    { year: 2021, quarter: 2, value: 131.59, publishedAt: new Date("2021-07-13") },
    { year: 2021, quarter: 1, value: 130.69, publishedAt: new Date("2021-04-14") },
    { year: 2020, quarter: 4, value: 130.26, publishedAt: new Date("2021-01-15") },
];

async function main() {
    console.log(`Start seeding IRL data...`);
    for (const irl of IRL_HISTORY) {
        await prisma.rentIndex.upsert({
            where: {
                year_quarter: {
                    year: irl.year,
                    quarter: irl.quarter
                }
            },
            update: {
                value: irl.value,
                publishedAt: irl.publishedAt
            },
            create: {
                year: irl.year,
                quarter: irl.quarter,
                value: irl.value,
                publishedAt: irl.publishedAt
            }
        });
        console.log(`Upserted IRL for Q${irl.quarter} ${irl.year}: ${irl.value}`);
    }
    console.log(`Seeding finished.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
