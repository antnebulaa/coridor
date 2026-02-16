import { NextResponse } from "next/server";
import { createElement } from "react";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import { sendEmail } from "@/lib/email";
import { EmailTemplate } from "@/components/emails/EmailTemplate";
import { PLAN_INFO } from "@/lib/plan-features";

export async function POST(
    request: Request,
    props: { params: Promise<{ userId: string }> }
) {
    const params = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = params;

    try {
        const body = await request.json();
        const { plan, durationMonths, reason } = body;

        // Validate inputs
        if (!plan || !["PLUS", "PRO"].includes(plan)) {
            return NextResponse.json(
                { error: "Invalid plan. Must be PLUS or PRO." },
                { status: 400 }
            );
        }

        const validDurations = [1, 3, 6, 12];
        if (
            !durationMonths ||
            typeof durationMonths !== "number" ||
            !validDurations.includes(durationMonths)
        ) {
            return NextResponse.json(
                { error: "Invalid durationMonths. Must be 1, 3, 6, or 12." },
                { status: 400 }
            );
        }

        if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
            return NextResponse.json(
                { error: "A reason is required for gifted subscriptions." },
                { status: 400 }
            );
        }

        // Verify user exists
        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });

        if (!targetUser) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Calculate endDate
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + durationMonths);

        // Create subscription, update user plan, and notify in a transaction
        const subscription = await prisma.$transaction(async (tx) => {
            const newSubscription = await tx.subscription.create({
                data: {
                    userId,
                    plan: plan as "PLUS" | "PRO",
                    status: "ACTIVE",
                    startDate,
                    endDate,
                    isGifted: true,
                    giftedById: currentUser.id,
                    giftReason: reason.trim(),
                },
            });

            await tx.user.update({
                where: { id: userId },
                data: { plan: plan as "PLUS" | "PRO" },
            });

            // Notify the user about their gifted subscription
            const monthLabel = durationMonths === 1 ? "1 mois" : `${durationMonths} mois`;
            await tx.notification.create({
                data: {
                    userId,
                    type: "SUBSCRIPTION_GIFT",
                    title: `Vous avez recu un abonnement ${plan} !`,
                    message: `Un abonnement ${plan} de ${monthLabel} vous a ete offert. ${reason.trim() ? `Raison : ${reason.trim()}` : ""}`.trim(),
                    link: "/account/subscription",
                },
            });

            // Create a free invoice record for the gifted subscription
            await tx.invoice.create({
                data: {
                    userId,
                    subscriptionId: newSubscription.id,
                    amountCents: 0,
                    description: `Abonnement ${plan} offert — ${monthLabel}`,
                    status: "PAID",
                },
            });

            return newSubscription;
        });

        // Send email notification to the user (outside transaction so failed email doesn't rollback)
        try {
            const targetUserEmail = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true, name: true, firstName: true },
            });

            if (targetUserEmail?.email) {
                const planInfo = PLAN_INFO[plan] || PLAN_INFO.FREE;
                const monthLabel =
                    durationMonths === 1
                        ? "1 mois"
                        : `${durationMonths} mois`;
                const userName =
                    targetUserEmail.firstName ||
                    targetUserEmail.name ||
                    "Cher utilisateur";
                const appUrl =
                    process.env.NEXT_PUBLIC_APP_URL || "https://coridor.fr";

                await sendEmail(
                    targetUserEmail.email,
                    `Un cadeau de l'équipe Coridor`,
                    createElement(
                        EmailTemplate,
                        {
                            heading: `${userName}, un cadeau pour vous !`,
                            actionLabel:
                                "Découvrir mes nouvelles fonctionnalités",
                            actionUrl: `${appUrl}/account/subscription`,
                            children: null,
                        },
                        createElement(
                            "p",
                            { style: { margin: "0 0 16px" } },
                            `Nous vous avons offert un abonnement ${planInfo.displayName} pendant ${monthLabel}.`
                        ),
                        reason.trim()
                            ? createElement(
                                  "p",
                                  {
                                      style: {
                                          margin: "0 0 16px",
                                          color: "#666",
                                      },
                                  },
                                  `Raison : ${reason.trim()}`
                              )
                            : null,
                        createElement(
                            "p",
                            {
                                style: {
                                    margin: "0 0 8px",
                                    fontWeight: "600",
                                },
                            },
                            "Ce que votre nouveau plan inclut :"
                        ),
                        createElement(
                            "ul",
                            {
                                style: {
                                    margin: "0 0 16px",
                                    paddingLeft: "20px",
                                },
                            },
                            ...planInfo.highlightFeatures.map((f, i) =>
                                createElement(
                                    "li",
                                    { key: i, style: { margin: "4px 0" } },
                                    f
                                )
                            )
                        )
                    )
                );
            }
        } catch (emailError) {
            console.error(
                "Failed to send gift subscription email:",
                emailError
            );
            // Don't fail the request if email fails
        }

        return NextResponse.json({
            id: subscription.id,
            userId: subscription.userId,
            plan: subscription.plan,
            status: subscription.status,
            startDate: subscription.startDate.toISOString(),
            endDate: subscription.endDate?.toISOString() || null,
            isGifted: subscription.isGifted,
            giftedById: subscription.giftedById,
            giftReason: subscription.giftReason,
            createdAt: subscription.createdAt.toISOString(),
            updatedAt: subscription.updatedAt.toISOString(),
        });
    } catch (error) {
        console.error(
            "Error in POST /api/admin/users/[userId]/gift-subscription",
            error
        );
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
