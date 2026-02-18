import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

interface IParams {
    propertyId: string;
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<IParams> }
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const { propertyId } = await params;

    if (!propertyId) {
        return NextResponse.json({ error: "ID du bien manquant" }, { status: 400 });
    }

    // Verify ownership
    const property = await prisma.property.findUnique({
        where: { id: propertyId },
    });

    if (!property || property.ownerId !== currentUser.id) {
        return NextResponse.json({ error: "Bien non trouve ou acces refuse" }, { status: 403 });
    }

    const body = await request.json();

    const {
        legalRegime,
        waterHeatingSystem,
        hasCave,
        caveReference,
        hasParking,
        parkingReference,
        hasGarage,
        garageReference,
        isZoneTendue,
        referenceRent,
        referenceRentIncreased,
        rentSupplement,
        previousRent,
        previousRentDate,
        leadDiagnosticDate,
        leadDiagnosticResult,
        asbestosDiagnosticDate,
        asbestosDiagnosticResult,
        ownerLegalStatus,
        ownerSiren,
        ownerSiege,
    } = body;

    try {
        const updatedProperty = await prisma.property.update({
            where: { id: propertyId },
            data: {
                // Regime juridique
                legalRegime: legalRegime ?? undefined,
                waterHeatingSystem: waterHeatingSystem ?? undefined,

                // Annexes
                hasCave: hasCave !== undefined ? Boolean(hasCave) : undefined,
                caveReference: caveReference ?? undefined,
                hasParking: hasParking !== undefined ? Boolean(hasParking) : undefined,
                parkingReference: parkingReference ?? undefined,
                hasGarage: hasGarage !== undefined ? Boolean(hasGarage) : undefined,
                garageReference: garageReference ?? undefined,

                // Zone tendue
                isZoneTendue: isZoneTendue !== undefined ? Boolean(isZoneTendue) : undefined,
                referenceRent: referenceRent !== undefined && referenceRent !== null ? parseFloat(String(referenceRent)) : null,
                referenceRentIncreased: referenceRentIncreased !== undefined && referenceRentIncreased !== null ? parseFloat(String(referenceRentIncreased)) : null,
                rentSupplement: rentSupplement !== undefined && rentSupplement !== null ? parseFloat(String(rentSupplement)) : null,
                previousRent: previousRent !== undefined && previousRent !== null ? parseFloat(String(previousRent)) : null,
                previousRentDate: previousRentDate ? new Date(previousRentDate) : null,

                // Diagnostics complementaires
                leadDiagnosticDate: leadDiagnosticDate ? new Date(leadDiagnosticDate) : null,
                leadDiagnosticResult: leadDiagnosticResult ?? undefined,
                asbestosDiagnosticDate: asbestosDiagnosticDate ? new Date(asbestosDiagnosticDate) : null,
                asbestosDiagnosticResult: asbestosDiagnosticResult ?? undefined,

                // Qualite du bailleur
                ownerLegalStatus: ownerLegalStatus ?? undefined,
                ownerSiren: ownerSiren ?? undefined,
                ownerSiege: ownerSiege ?? undefined,
            },
        });

        return NextResponse.json(updatedProperty);
    } catch (error) {
        console.error("Failed to update legal info:", error);
        return NextResponse.json({ error: "Erreur lors de la mise a jour" }, { status: 500 });
    }
}
