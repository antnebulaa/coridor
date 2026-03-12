import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

interface IParams {
  propertyId: string;
}

/**
 * PATCH /api/properties/[propertyId]/investment
 * Updates investment & loan fields on a Property.
 * Used by the progressive data collection on /finances.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<IParams> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { propertyId } = await params;
  if (!propertyId) {
    return NextResponse.json({ error: "ID du bien manquant" }, { status: 400 });
  }

  // Verify ownership
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { ownerId: true },
  });

  if (!property || property.ownerId !== currentUser.id) {
    return NextResponse.json({ error: "Bien non trouvé ou accès refusé" }, { status: 403 });
  }

  const body = await request.json();

  // Whitelist allowed fields
  const data: Record<string, unknown> = {};

  if (body.purchasePrice !== undefined) {
    const val = parseInt(String(body.purchasePrice), 10);
    if (!isNaN(val) && val > 0) data.purchasePrice = val;
  }
  if (body.purchaseDate !== undefined) {
    data.purchaseDate = new Date(body.purchaseDate);
  }
  if (body.estimatedCurrentValue !== undefined) {
    const val = parseInt(String(body.estimatedCurrentValue), 10);
    if (!isNaN(val) && val > 0) data.estimatedCurrentValue = val;
  }
  if (body.estimatedValueDate !== undefined) {
    data.estimatedValueDate = new Date(body.estimatedValueDate);
  }
  if (body.acquisitionMode !== undefined) {
    data.acquisitionMode = String(body.acquisitionMode);
  }
  if (body.loanAmount !== undefined) {
    const val = parseInt(String(body.loanAmount), 10);
    if (!isNaN(val) && val > 0) data.loanAmount = val;
  }
  if (body.loanRate !== undefined) {
    const val = parseFloat(String(body.loanRate));
    if (!isNaN(val) && val >= 0) data.loanRate = val;
  }
  if (body.loanStartDate !== undefined) {
    data.loanStartDate = new Date(body.loanStartDate);
  }
  if (body.loanEndDate !== undefined) {
    data.loanEndDate = new Date(body.loanEndDate);
  }
  if (body.loanMonthlyPayment !== undefined) {
    const val = parseInt(String(body.loanMonthlyPayment), 10);
    if (!isNaN(val) && val > 0) data.loanMonthlyPayment = val;
  }
  if (body.loanBank !== undefined) {
    data.loanBank = String(body.loanBank);
  }
  if (body.hasNoLoan !== undefined) {
    data.hasNoLoan = !!body.hasNoLoan;
  }

  // Validate loan date consistency
  if (data.loanStartDate && data.loanEndDate) {
    const startD = data.loanStartDate as Date;
    const endD = data.loanEndDate as Date;
    if (startD >= endD) {
      return NextResponse.json(
        { error: "La date de début du prêt doit être antérieure à la date de fin" },
        { status: 400 }
      );
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Aucun champ valide" }, { status: 400 });
  }

  try {
    const updated = await prisma.property.update({
      where: { id: propertyId },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/properties/.../investment] Error:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}
