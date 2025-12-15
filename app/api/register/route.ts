import { generateUniqueCode } from "@/libs/uniqueCode";
import bcrypt from "bcrypt";
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

    // Generate a unique code (simple loop to ensure uniqueness could be added but for MVP just generating is fine, chance of collision is low but handled by DB constraint unique error if really needed, but for now just single attempt)
    const uniqueCode = generateUniqueCode();

    const user = await prisma.user.create({
        data: {
            email,
            name,
            hashedPassword,
            phoneNumber,
            birthDate: birthDate ? new Date(birthDate) : null,
            address,
            uniqueCode // Add unique code
        },
    });

    return NextResponse.json(user);
}
