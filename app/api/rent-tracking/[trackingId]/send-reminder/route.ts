import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { RentCollectionService } from "@/services/RentCollectionService";

interface IParams {
  trackingId: string;
}

/**
 * POST /api/rent-tracking/[trackingId]/send-reminder
 *
 * Envoyer un rappel amiable au locataire via la messagerie Coridor.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<IParams> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { trackingId } = await params;

    await RentCollectionService.sendFriendlyReminder(
      trackingId,
      currentUser.id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Error sending reminder:", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    const status =
      message === "Non autorisé"
        ? 403
        : message === "Suivi de paiement introuvable"
          ? 404
          : message.includes("Aucune conversation")
            ? 404
            : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
