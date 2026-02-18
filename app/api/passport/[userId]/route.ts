import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { PassportService } from "@/services/PassportService";

interface IParams {
  userId: string;
}

/**
 * GET /api/passport/[userId]
 * View a candidate's passport (landlord view, filtered by settings + consent).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<IParams> }
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId } = await params;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "userId invalide" },
        { status: 400 }
      );
    }

    const passport = await PassportService.getVisiblePassport(
      userId,
      currentUser.id
    );

    if (!passport) {
      return NextResponse.json(
        { error: "Passeport non disponible" },
        { status: 404 }
      );
    }

    return NextResponse.json(passport);
  } catch (error: any) {
    console.error("[Passport View GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
