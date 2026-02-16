import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { RentCollectionService } from "@/services/RentCollectionService";

interface IParams {
  trackingId: string;
}

/**
 * PATCH /api/rent-tracking/[trackingId]/ignore
 *
 * Ignorer un mois avec un motif.
 * Body: { reason: string }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<IParams> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { trackingId } = await params;
    const body = await request.json();

    if (!body.reason || typeof body.reason !== "string") {
      return NextResponse.json(
        { error: "Le champ reason est requis" },
        { status: 400 }
      );
    }

    await RentCollectionService.ignoreMonth(
      trackingId,
      currentUser.id,
      body.reason
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Error ignoring month:", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    const status =
      message === "Non autorisé"
        ? 403
        : message === "Suivi de paiement introuvable"
          ? 404
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
