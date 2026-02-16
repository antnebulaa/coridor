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
        dpeDate,
        electricalDiagnosticDate,
        electricalInstallYear,
        gasDiagnosticDate,
        gasInstallYear,
        hasGasInstallation,
        erpDate,
    } = body;

    // Auto-compute DPE expiry date (date + 10 years)
    let computedDpeExpiryDate: Date | null = null;
    if (dpeDate) {
        const d = new Date(dpeDate);
        d.setFullYear(d.getFullYear() + 10);
        computedDpeExpiryDate = d;
    }

    try {
        const updatedProperty = await prisma.property.update({
            where: { id: propertyId },
            data: {
                dpeDate: dpeDate ? new Date(dpeDate) : null,
                dpeExpiryDate: computedDpeExpiryDate,
                electricalDiagnosticDate: electricalDiagnosticDate ? new Date(electricalDiagnosticDate) : null,
                electricalInstallYear: electricalInstallYear ? parseInt(String(electricalInstallYear)) : null,
                gasDiagnosticDate: gasDiagnosticDate ? new Date(gasDiagnosticDate) : null,
                gasInstallYear: gasInstallYear ? parseInt(String(gasInstallYear)) : null,
                hasGasInstallation: Boolean(hasGasInstallation),
                erpDate: erpDate ? new Date(erpDate) : null,
            },
        });

        // Sync reminders for this property (if ReminderEngine is available)
        try {
            const { ReminderEngine } = await import("@/services/ReminderEngine");
            await ReminderEngine.syncRemindersForProperty(propertyId);
        } catch (syncError) {
            // ReminderEngine may not be available yet; the cron job will handle sync later
            console.warn("ReminderEngine sync skipped (service not available):", syncError);
        }

        return NextResponse.json(updatedProperty);
    } catch (error) {
        console.error("Failed to update diagnostics:", error);
        return NextResponse.json({ error: "Erreur lors de la mise a jour" }, { status: 500 });
    }
}
