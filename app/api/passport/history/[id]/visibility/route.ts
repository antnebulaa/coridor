import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { PassportService } from "@/services/PassportService";

interface IParams {
  id: string;
}

/**
 * PATCH /api/passport/history/[id]/visibility
 * Toggle visibility of a rental history entry.
 * Body: { isHidden: boolean }
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
    const body = await request.json();

    if (typeof body.isHidden !== "boolean") {
      return NextResponse.json(
        { error: "Le champ isHidden (boolean) est requis" },
        { status: 400 }
      );
    }

    const updated = await PassportService.toggleHistoryVisibility(
      currentUser.id,
      id,
      body.isHidden
    );

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[Passport Visibility PATCH] Error:", error);
    const status = error.message?.includes("introuvable") ? 404 : 500;
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status }
    );
  }
}
