
import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

interface IParams {
    notificationId: string;
}

export async function PATCH(
    request: Request,
    props: { params: Promise<IParams> }
) {
    const params = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { isRead } = body;

    try {
        const notification = await prisma.notification.updateMany({
            where: {
                id: params.notificationId,
                userId: currentUser.id // Ensure ownership
            },
            data: {
                isRead
            }
        });

        return NextResponse.json(notification);
    } catch (error) {
        console.error("NOTIFICATION_UPDATE_ERROR", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
