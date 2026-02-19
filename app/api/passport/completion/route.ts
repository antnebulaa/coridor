import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import { PassportService } from "@/services/PassportService";
import { computePassportCompletion, PassportCompletionInput } from "@/lib/passportCompletion";

/**
 * GET /api/passport/completion
 * Returns the passport progressive disclosure completion data.
 */
export async function GET() {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Fetch tenant profile with relations
        const profile = await prisma.tenantProfile.findUnique({
            where: { userId: currentUser.id },
            include: {
                rentalHistory: {
                    where: { isHidden: false },
                    include: {
                        landlordReview: {
                            select: { tenantConsented: true }
                        }
                    }
                },
            },
        });

        // Check active bank connection
        const bankConnection = await prisma.bankConnection.findFirst({
            where: { userId: currentUser.id, isActive: true },
            select: { id: true },
        });

        // Compute total rental months from history
        let totalRentalMonths = 0;
        if (profile?.rentalHistory) {
            for (const rh of profile.rentalHistory) {
                const start = new Date(rh.startDate);
                const end = rh.endDate ? new Date(rh.endDate) : new Date();
                const months = Math.max(0,
                    (end.getFullYear() - start.getFullYear()) * 12 +
                    (end.getMonth() - start.getMonth())
                );
                totalRentalMonths += months;
            }
        }

        // Count consented landlord references
        const landlordReferenceCount = profile?.rentalHistory?.filter(
            rh => rh.landlordReview?.tenantConsented
        ).length ?? 0;

        // Get passport score (may be null if no profile)
        let overallScore: number | null = null;
        try {
            const score = await PassportService.computeScore(currentUser.id);
            overallScore = score?.globalScore ?? null;
        } catch {
            // Ignore — no score available
        }

        // Compute percentile rank (only if enough users)
        let percentileRank: number | null = null;
        if (overallScore !== null) {
            const totalWithPassport = await prisma.tenantProfile.count({
                where: { verifiedMonths: { gt: 0 } }
            });

            if (totalWithPassport >= 100) {
                // Approximate: we don't store globalScore in DB,
                // so use verifiedMonths as proxy for ranking
                const belowCount = await prisma.tenantProfile.count({
                    where: {
                        verifiedMonths: { gt: 0, lt: profile?.verifiedMonths ?? 0 },
                    }
                });
                percentileRank = Math.round(100 - (belowCount / totalWithPassport) * 100);
            }
        }

        const input: PassportCompletionInput = {
            hasBankConnection: !!bankConnection,
            hasIdentityVerified: false, // Not implemented yet
            rentalHistoryCount: profile?.rentalHistory?.length ?? 0,
            landlordReferenceCount,
            hasProfessionalInfo: !!(profile?.jobType && profile?.netSalary),
            hasProfilePhoto: !!currentUser.image,
            hasBio: !!profile?.bio,
            verifiedMonths: profile?.verifiedMonths ?? 0,
            totalRentalMonths,
            overallScore,
            percentileRank,
        };

        const completionData = computePassportCompletion(input);

        return NextResponse.json(completionData);
    } catch (error: any) {
        console.error("[Passport Completion GET] Error:", error);
        return NextResponse.json(
            { error: error.message || "Erreur serveur" },
            { status: 500 }
        );
    }
}
