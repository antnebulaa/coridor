import { NextResponse } from "next/server";

import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { syncPropertyListings } from "@/lib/syncListingCardData";

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
        image, // NEW
        bio,
        languages
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
            image, // NEW
            ...(bio !== undefined && { bio: typeof bio === 'string' ? bio.slice(0, 200) : null }),
            ...(languages !== undefined && { languages: Array.isArray(languages) ? languages.filter((l: any) => typeof l === 'string') : [] }),
        }
    });

    // Resync cardData for all owner's listings (bio, languages, image changes)
    if (bio !== undefined || languages !== undefined || image !== undefined || firstName !== undefined || lastName !== undefined) {
        const properties = await prisma.property.findMany({
            where: { ownerId: currentUser.id },
            select: { id: true },
        });
        for (const prop of properties) {
            syncPropertyListings(prop.id).catch(() => {});
        }
    }

    return NextResponse.json(updatedUser);
}
