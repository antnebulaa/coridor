import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

export async function PATCH(
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
        const { plan } = body;

        // Validate plan
        if (!plan || !["FREE", "PLUS", "PRO"].includes(plan)) {
            return NextResponse.json(
                { error: "Invalid plan. Must be FREE, PLUS, or PRO." },
                { status: 400 }
            );
        }

        // Verify user exists
        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, plan: true },
        });

        if (!targetUser) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Use transaction for atomicity
        const updatedUser = await prisma.$transaction(async (tx) => {
            // If downgrading to FREE, cancel all active subscriptions
            if (plan === "FREE") {
                await tx.subscription.updateMany({
                    where: {
                        userId,
                        status: { in: ["ACTIVE", "GIFTED"] },
                    },
                    data: {
                        status: "CANCELLED",
                    },
                });
            }

            // Update the user's plan
            return tx.user.update({
                where: { id: userId },
                data: { plan: plan as "FREE" | "PLUS" | "PRO" },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    role: true,
                    userMode: true,
                    plan: true,
                    isBanned: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        });

        return NextResponse.json({
            ...updatedUser,
            createdAt: updatedUser.createdAt.toISOString(),
            updatedAt: updatedUser.updatedAt.toISOString(),
        });
    } catch (error) {
        console.error(
            "Error in PATCH /api/admin/users/[userId]/change-plan",
            error
        );
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
