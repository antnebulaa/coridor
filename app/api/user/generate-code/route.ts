import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import { generateUniqueCode } from "@/libs/uniqueCode";

export async function POST(request: Request) {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // If user already has a code, return it (idempotent-ish, or do we allow regen? Let's assume we just want to ensure one exists)
        if (currentUser.uniqueCode) {
            return NextResponse.json(currentUser);
        }

        const uniqueCode = generateUniqueCode();

        const updatedUser = await prisma.user.update({
            where: {
                id: currentUser.id
            },
            data: {
                uniqueCode
            }
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error('GENERATE_CODE_ERROR', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
