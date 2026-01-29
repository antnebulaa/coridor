
import { PrismaClient, ExpenseCategory, ExpenseFrequency } from '@prisma/client';

const prisma = new PrismaClient();

const RENTAL_UNIT_ID = "ca611e29-52e0-49f4-bd28-2f32ee73f00c";
const TENANT_ID = "c82e6642-d8c9-4f1a-bf15-32c189a41d64";
const OWNER_ID = "103bc9be-bebd-44bf-9e1e-64686d26aa1d";

// Simulation Parameters
const START_DATE = new Date('2021-02-02');
const SIGNITURE_DATE = new Date('2021-01-04');
const BASE_RENT = 650; // Euros
const BASE_CHARGES = 60; // Euros
const PURCHASE_PRICE = 165000; // Euros

async function main() {
    console.log("Starting Simulation...");

    // 1. Get Rental Unit & Property
    const unit = await prisma.rentalUnit.findUnique({
        where: { id: RENTAL_UNIT_ID },
        include: { property: true }
    });

    if (!unit) {
        console.error("Rental Unit not found!");
        return;
    }
    const propertyId = unit.propertyId;
    console.log(`Property: ${propertyId}, Unit: ${unit.name}`);

    // Update Property with Purchase Price
    await prisma.property.update({
        where: { id: propertyId },
        data: { purchasePrice: PURCHASE_PRICE }
    });

    // 2. Ensure Listing Exists
    let listing = await prisma.listing.findFirst({
        where: { rentalUnitId: RENTAL_UNIT_ID }
    });

    if (!listing) {
        console.log("Creating Listing...");
        listing = await prisma.listing.create({
            data: {
                rentalUnitId: RENTAL_UNIT_ID,
                title: "Appartement T2 Sympa (Simulation)",
                description: "Simulation 5 ans",
                price: BASE_RENT,
                charges: BASE_CHARGES,
                isPublished: true,
                status: 'PUBLISHED',
                availableFrom: START_DATE,
                leaseType: 'LONG_TERM'
            }
        });
    }

    // 3. Ensure Tenant Scope Exists
    let scope = await prisma.tenantCandidateScope.findFirst({
        where: {
            creatorUserId: TENANT_ID,
            compositionType: 'SOLO'
        }
    });

    if (!scope) {
        console.log("Creating Candidate Scope...");
        scope = await prisma.tenantCandidateScope.create({
            data: {
                creatorUserId: TENANT_ID,
                compositionType: 'SOLO',
                targetLeaseType: 'ANY',

            }
        });
    }

    // 4. Create/Update Rental Application (Lease)
    console.log("Creating/Updating Lease...");
    // Check if app exists
    let app = await prisma.rentalApplication.findFirst({
        where: {
            listingId: listing.id,
            candidateScopeId: scope.id
        }
    });

    if (!app) {
        app = await prisma.rentalApplication.create({
            data: {
                listingId: listing.id,
                candidateScopeId: scope.id,
                status: 'ACCEPTED',
                leaseStatus: 'SIGNED',
                yousignSignatureId: 'simulated_sig_123',
                signedLeaseUrl: 'https://example.com/bail_signe_simulation.pdf',
                appliedAt: SIGNITURE_DATE
            }
        });
    } else {
        await prisma.rentalApplication.update({
            where: { id: app.id },
            data: {
                status: 'ACCEPTED',
                leaseStatus: 'SIGNED',
                yousignSignatureId: 'simulated_sig_123',
                signedLeaseUrl: 'https://example.com/bail_signe_simulation.pdf',
                appliedAt: SIGNITURE_DATE
            }
        });
    }
    const appId = app.id;

    // 5. Generate Lease Financials (History)
    console.log("Generating Financial History...");
    // Clear existing
    await prisma.leaseFinancials.deleteMany({ where: { rentalApplicationId: appId } });

    const financialsData = [
        { start: new Date('2021-02-02'), end: new Date('2022-02-01'), rent: 650, charges: 60 },
        { start: new Date('2022-02-02'), end: new Date('2023-02-01'), rent: 660, charges: 65 }, // Indexation +10
        { start: new Date('2023-02-02'), end: new Date('2024-02-01'), rent: 675, charges: 70 }, // +15
        { start: new Date('2024-02-02'), end: new Date('2025-02-01'), rent: 690, charges: 75 }, // +15
        { start: new Date('2025-02-02'), end: null, rent: 710, charges: 80 }, // Current
    ];

    for (const f of financialsData) {
        await prisma.leaseFinancials.create({
            data: {
                rentalApplicationId: appId,
                baseRentCents: f.rent * 100,
                serviceChargesCents: f.charges * 100,
                startDate: f.start,
                endDate: f.end
            }
        });
    }


    // 6. Generate Expenses (5 Years)
    console.log("Generating Expenses...");
    // We won't delete all expenses because others might exist, but we can delete created by this script if we tagged them? 
    // Or just clear expenses for this property for simplicity (Simulation mode).
    // Let's clear carefully.
    await prisma.expense.deleteMany({ where: { propertyId: propertyId } });
    await prisma.reconciliationHistory.deleteMany({ where: { propertyId: propertyId } }); // Cascade should clear items? No, items link expense and reconcil.

    const years = [2021, 2022, 2023, 2024, 2025];
    const generatedExpenses = [];

    for (const year of years) {
        // Skip months before start date in 2021
        const startMonth = year === 2021 ? 1 : 0; // Feb is 1

        for (let month = startMonth; month < 12; month++) {
            // Stop if future (Today is 2025, assuming early 2025 or mock future)
            // Let's generate full 2025 until "today" or just full year for simplicity of simulation.

            const date = new Date(year, month, 15);

            // Monthly Recurring
            // 1. Water (Recoverable) ~ 20-30€
            const water = await prisma.expense.create({
                data: {
                    propertyId: propertyId,
                    rentalUnitId: unit.id,
                    category: 'COLD_WATER',
                    label: `Eau Froide ${month + 1}/${year}`,
                    amountTotalCents: (25 + Math.random() * 10) * 100,
                    dateOccurred: date,
                    frequency: 'MONTHLY',
                    isRecoverable: true,
                    recoverableRatio: 1.0,
                    amountRecoverableCents: null // Auto calc
                }
            });
            generatedExpenses.push({ ...water, year });

            // 2. Common Elec (Recoverable 70%) ~ 15€
            const elec = await prisma.expense.create({
                data: {
                    propertyId: propertyId,
                    category: 'ELECTRICITY_COMMON',
                    label: `Élec. Communs ${month + 1}/${year}`,
                    amountTotalCents: (15 + Math.random() * 5) * 100,
                    dateOccurred: date,
                    frequency: 'MONTHLY',
                    isRecoverable: true,
                    recoverableRatio: 0.7,
                }
            });
            generatedExpenses.push({ ...elec, year });

            // 3. Maintenance (Recoverable) ~ 30€
            const maint = await prisma.expense.create({
                data: {
                    propertyId: propertyId,
                    category: 'MAINTENANCE',
                    label: `Ménage Hall ${month + 1}/${year}`,
                    amountTotalCents: 3000,
                    dateOccurred: date,
                    frequency: 'MONTHLY',
                    isRecoverable: true,
                    recoverableRatio: 1.0,
                }
            });
            generatedExpenses.push({ ...maint, year });
        }

        // Yearly Expenses
        const midYear = new Date(year, 9, 15); // Oct

        // 1. Taxe Foncière (Deductible, Not Recoverable, except TOM)
        const tomAmount = 150 + (year - 2021) * 10;
        const taxTotal = 1200 + (year - 2021) * 50;

        const tax = await prisma.expense.create({
            data: {
                propertyId: propertyId,
                category: 'TAX_PROPERTY',
                label: `Taxe Foncière ${year}`,
                amountTotalCents: taxTotal * 100,
                dateOccurred: midYear,
                frequency: 'YEARLY',
                isRecoverable: true, // Only TOM part
                recoverableRatio: 0.0, // Special case: Manual amount set
                amountRecoverableCents: tomAmount * 100,
                amountDeductibleCents: (taxTotal - tomAmount) * 100 // Remainder
            }
        });
        generatedExpenses.push({ ...tax, year });

        // 2. GLI Insurance (Deductible)
        const insurance = await prisma.expense.create({
            data: {
                propertyId: propertyId,
                category: 'INSURANCE_GLI',
                label: `Assurance GLI ${year}`,
                amountTotalCents: 250 * 100,
                dateOccurred: new Date(year, 0, 5), // Jan
                frequency: 'YEARLY',
                isRecoverable: false,
                amountDeductibleCents: 250 * 100
            }
        });
        generatedExpenses.push({ ...insurance, year });
    }

    // 7. Regularize Past Years (2021-2024)
    console.log("Regularizing 2021-2024...");
    const yearsToRegularize = [2021, 2022, 2023, 2024];

    for (const year of yearsToRegularize) {
        // 1. Filter expenses for this year
        const yearExpenses = generatedExpenses.filter(e => e.year === year && e.isRecoverable);

        // 2. Calculate Totals
        let totalReal = 0;
        for (const exp of yearExpenses) {
            const amount = exp.amountRecoverableCents ?? Math.round(exp.amountTotalCents * (exp.recoverableRatio || 1.0));
            totalReal += amount;
        }

        // 3. Calculate Provisions (Approx for simplicity in seed, or use logic)
        // Let's look at financials.
        // 2021: 11 months * 60 = 660€
        // 2022: 1 mo * 60 + 11 mo * 65 = 60 + 715 = 775€
        // ... simplified calculation for seed
        let totalProvisions = 0;
        if (year === 2021) totalProvisions = 660 * 100;
        else if (year === 2022) totalProvisions = 775 * 100;
        else if (year === 2023) totalProvisions = 850 * 100; // Mock
        else if (year === 2024) totalProvisions = 950 * 100; // Mock

        const balance = totalReal - totalProvisions;

        // 4. Create History
        const reconciliation = await prisma.reconciliationHistory.create({
            data: {
                propertyId: propertyId,
                leaseId: appId,
                periodStart: new Date(year, 0, 1),
                periodEnd: new Date(year, 11, 31),
                totalRealChargesCents: Math.round(totalReal),
                totalProvisionsCents: totalProvisions,
                finalBalanceCents: Math.round(balance)
            }
        });

        // 5. Link & Lock Expenses
        const expenseIds = yearExpenses.map(e => e.id);
        await prisma.reconciliationItem.createMany({
            data: expenseIds.map(id => ({ reconciliationId: reconciliation.id, expenseId: id }))
        });

        await prisma.expense.updateMany({
            where: { id: { in: expenseIds } },
            data: { isFinalized: true }
        });
    }

    console.log("Simulation Complete.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
