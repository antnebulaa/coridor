import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { PassportService } from "@/services/PassportService";

/**
 * POST /api/passport/history
 * Add a manual rental history entry (off-Coridor lease).
 */
export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const {
      city,
      zipCode,
      propertyType,
      rentAmountCents,
      startDate,
      endDate,
      landlordName,
    } = body;

    if (!city || !propertyType || !startDate) {
      return NextResponse.json(
        { error: "Les champs city, propertyType et startDate sont requis" },
        { status: 400 }
      );
    }

    const entry = await PassportService.addManualRentalHistory(
      currentUser.id,
      {
        city,
        zipCode,
        propertyType,
        rentAmountCents,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        landlordName,
      }
    );

    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    console.error("[Passport History POST] Error:", error);
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
