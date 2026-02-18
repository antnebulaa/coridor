import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { PassportService } from "@/services/PassportService";

/**
 * GET /api/passport/score
 * Retrieve the passport score and sub-scores for the authenticated tenant.
 */
export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const score = await PassportService.computeScore(currentUser.id);

    if (!score) {
      return NextResponse.json(
        { error: "Profil locataire introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json(score);
  } catch (error: any) {
    console.error("[Passport Score GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
