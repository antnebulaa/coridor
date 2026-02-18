import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { PassportService } from "@/services/PassportService";

interface IParams {
  id: string;
}

/**
 * PATCH /api/passport/review/[id]/consent
 * Tenant consents to share a specific landlord review.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<IParams> }
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const review = await PassportService.consentToReview(
      currentUser.id,
      id
    );

    return NextResponse.json(review);
  } catch (error: any) {
    console.error("[Passport Review Consent PATCH] Error:", error);

    const message = error.message || "Erreur serveur";
    let status = 500;
    if (message.includes("introuvable")) status = 404;
    else if (message.includes("Non autorise")) status = 403;

    return NextResponse.json({ error: message }, { status });
  }
}
