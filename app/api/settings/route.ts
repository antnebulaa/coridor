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
        firstName,
        lastName,
        email,
        phoneNumber,
        address,
        addressLine1,
        building,
        apartment,
        city,
        zipCode,
        country,
        userMode,
        measurementSystem,
        birthDate,
        birthPlace,
        image // NEW
    } = body;

    const updatedUser = await prisma.user.update({
        where: {
            id: currentUser.id
        },
        data: {
            name,
            firstName,
            lastName,
            email,
            phoneNumber,
            address,
            addressLine1,
            building,
            apartment,
            city,
            zipCode,
            country,
            userMode,
            measurementSystem,
            birthDate,
            birthPlace,
            image // NEW
        }
    });

    return NextResponse.json(updatedUser);
}
