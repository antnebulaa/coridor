
import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

export async function GET(
    request: Request
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const notifications = await prisma.notification.findMany({
            where: {
                userId: currentUser.id
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 50 // Limit to last 50 notifications
        });

        return NextResponse.json(notifications);
    } catch (error) {
        console.error("NOTIFICATIONS_GET_ERROR", error);
        // @ts-ignore
        const errorMessage = error?.message || "Unknown error";
        return NextResponse.json({ error: "Internal Error", details: errorMessage }, { status: 500 });
    }
}

export async function POST(
    request: Request
) {
    // This endpoint handles creating notifications, generally called by system or admin
    // For security, strict checks should be applied. 
    // For now, let's assume it is open to authenticated users to trigger specific notifications or just strict admin.
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // For now, allow test creation or specific use cases
    const body = await request.json();
    const { userId, type, title, message, link } = body;

    if (!userId || !title || !message) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    try {
        const notification = await prisma.notification.create({
            data: {
                userId,
                type,
                title,
                message,
                link
            }
        });

        return NextResponse.json(notification);
    } catch (error) {
        console.error("NOTIFICATION_CREATE_ERROR", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
