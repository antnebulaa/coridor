import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

export async function POST(request: Request) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await prisma.tenantProfile.update({
            where: { userId: currentUser.id },
            data: {
                rentVerified: true
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Verify Rent Error:", error);
        return NextResponse.json({ error: "Failed to verify rent" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await prisma.tenantProfile.update({
            where: { userId: currentUser.id },
            data: {
                rentVerified: false,
                detectedRentAmount: null,
                rentPaymentDate: null
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Reset Rent Error:", error);
        return NextResponse.json({ error: "Failed to reset rent" }, { status: 500 });
    }
}
