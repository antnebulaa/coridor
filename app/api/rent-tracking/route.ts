import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { hasFeature } from '@/lib/features';


/**
 * GET /api/rent-tracking?applicationId=xxx
 *
 * Retourne les RentPaymentTracking pour un bail donné, triés par date desc.
 * Vérifie que l'utilisateur courant est le propriétaire du bail.
 */
export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Check feature access
    const canAccessRentTracking = await hasFeature(currentUser.id, 'RENT_TRACKING');
    if (!canAccessRentTracking) {
      return NextResponse.json(
        { error: 'Le suivi des loyers nécessite un abonnement Essentiel ou Pro.' },
        { status: 403 }
      );
    }


    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get("applicationId");

    if (!applicationId) {
      return NextResponse.json(
        { error: "Le paramètre applicationId est requis" },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur est le propriétaire du bail
    const application = await prisma.rentalApplication.findUnique({
      where: { id: applicationId },
      include: {
        listing: {
          include: {
            rentalUnit: {
              include: {
                property: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Bail introuvable" }, { status: 404 });
    }

    const ownerId = application.listing.rentalUnit.property.ownerId;
    if (ownerId !== currentUser.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Récupérer les trackings
    const trackings = await prisma.rentPaymentTracking.findMany({
      where: { rentalApplicationId: applicationId },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    });

    return NextResponse.json(trackings);
  } catch (error) {
    console.error("[API] Error fetching rent trackings:", error);
    return NextResponse.json(
      {
        error: "Erreur interne",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
