import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import { PLAN_INFO, ALL_FEATURES } from "@/lib/plan-features";

export async function GET() {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const userPlan = currentUser.plan || "FREE";
        const planInfo = PLAN_INFO[userPlan] || PLAN_INFO.FREE;

        // Get current active subscription
        const currentSubscription = await prisma.subscription.findFirst({
            where: {
                userId: currentUser.id,
                status: { in: ["ACTIVE", "GIFTED"] },
            },
            orderBy: { startDate: "desc" },
        });

        // Get subscription history
        const subscriptionHistory = await prisma.subscription.findMany({
            where: {
                userId: currentUser.id,
            },
            orderBy: { startDate: "desc" },
            select: {
                id: true,
                plan: true,
                status: true,
                startDate: true,
                endDate: true,
                isGifted: true,
                giftReason: true,
            },
        });

        // Build current subscription response with computed fields
        let currentSubscriptionResponse = null;
        if (currentSubscription) {
            const now = new Date();
            let daysRemaining = 0;
            let totalDays = 0;
            let percentRemaining = 0;

            if (currentSubscription.endDate) {
                daysRemaining = Math.max(
                    0,
                    Math.ceil(
                        (currentSubscription.endDate.getTime() - now.getTime()) /
                            86400000
                    )
                );
                totalDays = Math.ceil(
                    (currentSubscription.endDate.getTime() -
                        currentSubscription.startDate.getTime()) /
                        86400000
                );
                percentRemaining =
                    totalDays > 0
                        ? Math.max(
                              0,
                              Math.min(
                                  100,
                                  (daysRemaining / totalDays) * 100
                              )
                          )
                        : 0;
            }

            currentSubscriptionResponse = {
                id: currentSubscription.id,
                plan: currentSubscription.plan,
                status: currentSubscription.status,
                startDate: currentSubscription.startDate.toISOString(),
                endDate: currentSubscription.endDate?.toISOString() || null,
                isGifted: currentSubscription.isGifted,
                giftReason: currentSubscription.giftReason,
                daysRemaining,
                totalDays,
                percentRemaining: Math.round(percentRemaining * 100) / 100,
            };
        }

        // Build all features with included status
        const allFeatures = ALL_FEATURES.map((feature) => ({
            label: feature.label,
            includedIn: feature.includedIn,
            included: feature.includedIn.includes(
                userPlan as "FREE" | "PLUS" | "PRO"
            ),
        }));

        // Format subscription history
        const formattedHistory = subscriptionHistory.map((sub) => ({
            id: sub.id,
            plan: sub.plan,
            status: sub.status,
            startDate: sub.startDate.toISOString(),
            endDate: sub.endDate?.toISOString() || null,
            isGifted: sub.isGifted,
            giftReason: sub.giftReason,
        }));


        // Get user's invoices
        const invoices = await prisma.invoice.findMany({
            where: { userId: currentUser.id },
            orderBy: { invoiceDate: "desc" },
            select: {
                id: true,
                amountCents: true,
                description: true,
                status: true,
                invoiceDate: true,
                pdfUrl: true,
            },
        });

        const formattedInvoices = invoices.map((inv) => ({
            id: inv.id,
            amountCents: inv.amountCents,
            description: inv.description,
            status: inv.status,
            invoiceDate: inv.invoiceDate.toISOString(),
            pdfUrl: inv.pdfUrl,
        }));

        // Payment method (Stripe not yet integrated)
        const paymentMethod = null;

        return NextResponse.json({
            plan: userPlan,
            planInfo,
            currentSubscription: currentSubscriptionResponse,
            subscriptionHistory: formattedHistory,
            allFeatures,
            invoices: formattedInvoices,
            paymentMethod,
        });
    } catch (error) {
        console.error("Error in GET /api/account/subscription:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
