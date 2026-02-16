import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import { createNotification } from "@/libs/notifications";

export async function POST() {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Find the user's active subscription
        const activeSubscription = await prisma.subscription.findFirst({
            where: {
                userId: currentUser.id,
                status: { in: ["ACTIVE", "GIFTED"] },
            },
            orderBy: { startDate: "desc" },
        });

        if (!activeSubscription) {
            return NextResponse.json(
                { error: "Aucun abonnement actif à annuler." },
                { status: 400 }
            );
        }

        // Mark subscription as CANCELLED (it stays active until endDate, then the cron downgrades)
        await prisma.subscription.update({
            where: { id: activeSubscription.id },
            data: { status: "CANCELLED" },
        });

        // Notify the user
        await createNotification({
            userId: currentUser.id,
            type: "SUBSCRIPTION_CANCELLED",
            title: "Abonnement annulé",
            message: activeSubscription.endDate
                ? `Votre abonnement restera actif jusqu'au ${activeSubscription.endDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}. Vous passerez ensuite au plan Gratuit.`
                : "Votre abonnement a été annulé. Vous passerez au plan Gratuit.",
            link: "/account/subscription",
        });

        return NextResponse.json({
            success: true,
            message: "Abonnement annulé avec succès.",
            endDate: activeSubscription.endDate?.toISOString() || null,
        });
    } catch (error) {
        console.error("Error in POST /api/account/subscription/cancel:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
