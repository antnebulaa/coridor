import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { FiscalService } from "@/services/FiscalService";

export async function GET(request: Request) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");

    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear() - 1;

    if (isNaN(year) || year < 2000 || year > new Date().getFullYear()) {
        return NextResponse.json({ error: "Année invalide" }, { status: 400 });
    }

    try {
        const raw = await FiscalService.generateAllPropertiesSummary(currentUser.id, year);

        // Aggregate categories across all properties
        const categoryTotals: Record<string, { label: string; totalCents: number }> = {};
        const lineTotals: Record<string, { description: string; amountCents: number }> = {};
        let totalManagementFees = 0;

        for (const propSummary of raw.properties) {
            totalManagementFees += propSummary.managementFeesCents || 0;

            // Aggregate categories
            if (propSummary.categories) {
                for (const [key, cat] of Object.entries(propSummary.categories as Record<string, { label: string; amount: number }>)) {
                    if (!categoryTotals[key]) {
                        categoryTotals[key] = { label: cat.label, totalCents: 0 };
                    }
                    categoryTotals[key].totalCents += cat.amount || 0;
                }
            }

            // Aggregate declaration 2044 lines
            if (propSummary.lines) {
                for (const [lineNum, lineData] of Object.entries(propSummary.lines as Record<string, { label: string; amount: number }>)) {
                    if (!lineTotals[lineNum]) {
                        lineTotals[lineNum] = { description: lineData.label, amountCents: 0 };
                    }
                    lineTotals[lineNum].amountCents += lineData.amount || 0;
                }
            }
        }

        // Map to the shape expected by FiscalClient
        return NextResponse.json({
            year,
            properties: raw.properties.map((p: any) => ({
                id: p.property.id,
                title: [p.property.addressLine1, p.property.city].filter(Boolean).join(', ') || 'Bien sans adresse',
            })),
            grossRevenueCents: raw.totalGrossIncomeCents || 0,
            totalDeductibleCents: raw.totalDeductibleCents || 0,
            managementFeesCents: totalManagementFees,
            netTaxableIncomeCents: raw.totalNetIncomeCents || 0,
            byCategory: Object.entries(categoryTotals)
                .filter(([, v]) => v.totalCents > 0)
                .map(([category, v]) => ({
                    category,
                    label: v.label,
                    totalCents: v.totalCents,
                })),
            declaration2044: Object.entries(lineTotals)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([line, v]) => ({
                    line,
                    description: v.description,
                    amountCents: v.amountCents,
                })),
        });
    } catch (error) {
        console.error("[Fiscal Summary All] Error:", error);
        return NextResponse.json({ error: "Erreur lors de la génération du récapitulatif fiscal" }, { status: 500 });
    }
}
