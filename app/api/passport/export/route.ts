import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { PassportService } from "@/services/PassportService";

/**
 * GET /api/passport/export?format=json|pdf
 * Export the passport in JSON or PDF format (RGPD portability).
 */
export async function GET(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") || "json";

    if (format !== "json" && format !== "pdf") {
      return NextResponse.json(
        { error: "Format invalide. Utilisez json ou pdf." },
        { status: 400 }
      );
    }

    const result = await PassportService.exportPassport(
      currentUser.id,
      format
    );

    if (format === "json") {
      return NextResponse.json(result.data);
    }

    // PDF response
    return new NextResponse(result.data as any, {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
      },
    });
  } catch (error: any) {
    console.error("[Passport Export GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
