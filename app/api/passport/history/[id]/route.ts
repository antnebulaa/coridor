import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { PassportService } from "@/services/PassportService";

interface IParams {
  id: string;
}

/**
 * PATCH /api/passport/history/[id]
 * Edit a manual rental history entry. Only MANUAL entries can be edited.
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

    const {
      city,
      zipCode,
      propertyType,
      rentAmountCents,
      startDate,
      endDate,
      landlordName,
    } = body;

    const updated = await PassportService.editManualRentalHistory(
      currentUser.id,
      id,
      {
        city,
        zipCode,
        propertyType,
        rentAmountCents,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        landlordName,
      }
    );

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[Passport History PATCH] Error:", error);
    const status = error.message?.includes("introuvable") ? 404 : 500;
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status }
    );
  }
}

/**
 * DELETE /api/passport/history/[id]
 * Delete a manual rental history entry. Only MANUAL entries can be deleted.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<IParams> }
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    await PassportService.deleteManualRentalHistory(currentUser.id, id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Passport History DELETE] Error:", error);
    const status = error.message?.includes("introuvable") ? 404 : 500;
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status }
    );
  }
}
