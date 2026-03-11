import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function GET() {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ connected: false });
    }

    const count = await prisma.bankConnection.count({
        where: { userId: currentUser.id },
    });

    return NextResponse.json({ connected: count > 0 });
}
