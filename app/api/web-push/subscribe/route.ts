import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

export async function POST(request: Request) {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const subscription = await request.json();

        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
        }

        // Save subscription to DB
        const created = await prisma.pushSubscription.create({
            data: {
                userId: currentUser.id,
                endpoint: subscription.endpoint,
                keys: subscription.keys,
            },
        });

        return NextResponse.json(created);
    } catch (error) {
        console.error("Web Push Subscribe Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
