
import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

export async function POST(
    request: Request
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { listingId, targetUserId, reason, details } = body;

    if (!reason) {
        return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    }

    // Prevent self-reporting?
    if (targetUserId === currentUser.id) {
        return NextResponse.json({ error: "Cannot report yourself" }, { status: 400 });
    }

    try {
        const report = await prisma.report.create({
            data: {
                reporterId: currentUser.id,
                listingId,
                targetUserId,
                reason,
                details,
                status: "PENDING"
            }
        });

        return NextResponse.json(report);
    } catch (error) {
        console.error("REPORT CREATION ERROR", error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
