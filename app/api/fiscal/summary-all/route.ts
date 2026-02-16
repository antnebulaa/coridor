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
        const summary = await FiscalService.generateAllPropertiesSummary(currentUser.id, year);
        return NextResponse.json(summary);
    } catch (error) {
        console.error("[Fiscal Summary All] Error:", error);
        return NextResponse.json({ error: "Erreur lors de la génération du récapitulatif fiscal" }, { status: 500 });
    }
}
