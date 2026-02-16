import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import { FiscalService } from "@/services/FiscalService";

export async function GET(request: Request) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const yearParam = searchParams.get("year");

    if (!propertyId) {
        return NextResponse.json({ error: "propertyId requis" }, { status: 400 });
    }

    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear() - 1;

    if (isNaN(year) || year < 2000 || year > new Date().getFullYear()) {
        return NextResponse.json({ error: "Année invalide" }, { status: 400 });
    }

    // Verify ownership
    const property = await prisma.property.findUnique({
        where: { id: propertyId },
    });

    if (!property || property.ownerId !== currentUser.id) {
        return NextResponse.json({ error: "Bien non trouvé ou accès refusé" }, { status: 403 });
    }

    try {
        const summary = await FiscalService.generateFiscalSummary(propertyId, year);
        return NextResponse.json(summary);
    } catch (error) {
        console.error("[Fiscal Summary] Error:", error);
        return NextResponse.json({ error: "Erreur lors de la génération du récapitulatif fiscal" }, { status: 500 });
    }
}
