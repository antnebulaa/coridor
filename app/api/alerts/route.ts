
import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

export async function GET(request: Request) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const alerts = await (prisma as any).searchAlert.findMany({
            where: {
                userId: currentUser.id
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(alerts);
    } catch (error) {
        console.error("GET_ALERTS_ERROR", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export async function POST(
    request: Request
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
        locationValue,
        category,
        minPrice,
        maxPrice,
        roomCount,
        frequency
    } = body;

    // Validate that at least one criteria is present to avoid spamming?
    // Or just allow saving whatever current search is.

    try {
        const alert = await (prisma as any).searchAlert.create({
            data: {
                userId: currentUser.id,
                email: currentUser.email, // Use account email by default
                locationValue,
                category,
                minPrice: minPrice ? parseInt(minPrice) : null,
                maxPrice: maxPrice ? parseInt(maxPrice) : null,
                roomCount: roomCount ? parseInt(roomCount) : null,
                frequency: frequency || "INSTANT",
                isActive: true
            }
        });

        return NextResponse.json(alert);
    } catch (error) {
        console.error("CREATE_ALERT_ERROR", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
