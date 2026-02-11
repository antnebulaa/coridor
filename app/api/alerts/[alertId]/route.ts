import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

interface IParams {
    params: Promise<{
        alertId: string;
    }>
}

export async function PATCH(
    request: Request,
    { params }: IParams
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { alertId } = await params;

    if (!alertId || typeof alertId !== 'string') {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const { isActive } = body;

    try {
        // Verify ownership
        const alert = await (prisma as any).searchAlert.findUnique({
            where: { id: alertId }
        });

        if (!alert || alert.userId !== currentUser.id) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const updatedAlert = await (prisma as any).searchAlert.update({
            where: { id: alertId },
            data: { isActive }
        });

        return NextResponse.json(updatedAlert);
    } catch (error) {
        console.error("UPDATE_ALERT_ERROR", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: IParams
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { alertId } = await params;

    if (!alertId || typeof alertId !== 'string') {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    try {
        // Verify ownership
        const alert = await (prisma as any).searchAlert.findUnique({
            where: { id: alertId }
        });

        if (!alert || alert.userId !== currentUser.id) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        await (prisma as any).searchAlert.delete({
            where: { id: alertId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE_ALERT_ERROR", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
