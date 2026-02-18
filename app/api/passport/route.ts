import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { PassportService } from "@/services/PassportService";

/**
 * GET /api/passport
 * Retrieve the full passport for the authenticated tenant.
 */
export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const passport = await PassportService.getPassport(currentUser.id);

    if (!passport) {
      return NextResponse.json(
        { error: "Profil locataire introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json(passport);
  } catch (error: any) {
    console.error("[Passport GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
