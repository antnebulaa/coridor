import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { FreelanceIncomeService } from "@/services/FreelanceIncomeService";

// GET — Retrieve freelance income analysis for current user
export async function GET() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.tenantProfile.findUnique({
        where: { userId: currentUser.id },
        select: {
            freelanceSmoothedIncome: true,
            freelanceAnnualIncome: true,
            freelanceIncomeConfidence: true,
            freelanceIncomeVerifiedAt: true,
            freelanceIncomeMonths: true,
            freelanceIncomeSources: true,
            freelanceIncomeBreakdown: true,
        },
    });

    if (!profile) {
        return NextResponse.json({ error: "No tenant profile" }, { status: 404 });
    }

    return NextResponse.json(profile);
}

// POST — Refresh analysis by re-fetching from Powens
export async function POST() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const analysis = await FreelanceIncomeService.refreshFromPowens(currentUser.id);

        if (!analysis) {
            return NextResponse.json({
                message: "No freelance income detected",
                freelanceSmoothedIncome: null,
            });
        }

        return NextResponse.json({
            freelanceSmoothedIncome: analysis.monthlySmoothedIncome,
            freelanceAnnualIncome: analysis.annualIncome,
            freelanceIncomeConfidence: analysis.confidence,
            freelanceIncomeVerifiedAt: analysis.verifiedAt,
            freelanceIncomeMonths: analysis.monthsCovered,
            freelanceIncomeSources: analysis.sources,
            freelanceIncomeBreakdown: analysis.monthlyBreakdown,
        });
    } catch (error: any) {
        console.error("[FreelanceIncome] Refresh error:", error);
        return NextResponse.json(
            { error: error.message || "Refresh failed" },
            { status: 500 }
        );
    }
}
