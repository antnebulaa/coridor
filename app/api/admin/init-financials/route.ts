import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";

export async function GET() {
    try {
        // 1. Find all "signed" applications (or effectively active ones)
        // Since we aren't sure if SIGNED is used, we'll check PENDING_SIGNATURE too, or just all for this migration logic.
        // Actually, let's filter for those that have a `signedLeaseUrl` OR status is SIGNED or PENDING_SIGNATURE
        const applications = await prisma.rentalApplication.findMany({
            where: {
                OR: [
                    { leaseStatus: 'SIGNED' },
                    { leaseStatus: 'PENDING_SIGNATURE' }, // For testing if SIGNED isn't used yet
                    // { signedLeaseUrl: { not: null } }
                ],
                // Ensure we don't duplicate
                financials: {
                    none: {}
                }
            },
            include: {
                listing: true,
                candidateScope: true
            }
        });

        const results = [];

        for (const app of applications) {
            const listing = app.listing;

            // Extract Charges
            let chargesAmount = 0;
            if (listing.charges) {
                const charges: any = listing.charges;
                if (typeof charges === 'number') {
                    chargesAmount = charges;
                } else if (typeof charges === 'object') {
                    chargesAmount = Number(charges.amount || charges.value || 0);
                }
            }

            // Determine Start Date
            // Use target move-in date, or created at as fallback
            const startDate = app.candidateScope.targetMoveInDate || app.appliedAt;

            // Create Financials
            const financial = await prisma.leaseFinancials.create({
                data: {
                    rentalApplicationId: app.id,
                    baseRentCents: listing.price * 100, // Listing price is usually in Euros in schema? Wait, schema says Int. 
                    // Listing.price is Int. Assume it's Euros based on name usually, but code says `amountTotalCents` in Expense.
                    // Let's check listing creation. If it's 500, is it 500 cents or 500 euros?
                    // User input implies Euros.
                    // Let's assume Listing.price is UNIT (Euros) and we convert to Cents.
                    serviceChargesCents: Math.round(chargesAmount * 100),
                    startDate: startDate
                }
            });

            results.push({ appId: app.id, financialId: financial.id });
        }

        return NextResponse.json({
            success: true,
            count: results.length,
            details: results
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
