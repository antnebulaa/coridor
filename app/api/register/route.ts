import bcrypt from "bcryptjs";
import prisma from "@/libs/prismadb";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const body = await request.json();
    const {
        email,
        name,
        password,
        phoneNumber,
        birthDate,
        address
    } = body;

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
        data: {
            email,
            name,
            hashedPassword,
            phoneNumber,
            birthDate: birthDate ? new Date(birthDate) : null,
            address
        },
    });

    return NextResponse.json(user);
}
