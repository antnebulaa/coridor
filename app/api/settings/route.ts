import { NextResponse } from "next/server";

import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function POST(
    request: Request,
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.error();
    }

    const body = await request.json();
    const {
        name,
        email,
        userMode,
        measurementSystem
    } = body;

    const updatedUser = await prisma.user.update({
        where: {
            id: currentUser.id
        },
        data: {
            name,
            email,
            userMode,
            measurementSystem
        }
    });

    return NextResponse.json(updatedUser);
}
