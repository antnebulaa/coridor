import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { RentCollectionService } from "@/services/RentCollectionService";

interface IParams {
  trackingId: string;
}

/**
 * PATCH /api/rent-tracking/[trackingId]/confirm
 *
 * Marquer un tracking comme payé manuellement.
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

    await RentCollectionService.markAsPaid(trackingId, currentUser.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Error confirming payment:", error);

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
