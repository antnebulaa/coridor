import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

export async function POST(request: Request) {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return NextResponse.error();
        }

        const body = await request.json();
        const { name, address, latitude, longitude, transportMode } = body;

        if (!name || !address || !latitude || !longitude) {
            return new NextResponse("Missing Info", { status: 400 });
        }

        const commuteLocation = await prisma.commuteLocation.create({
            data: {
                userId: currentUser.id,
                name,
                address,
                latitude,
                longitude,
                transportMode: transportMode || 'TRANSIT'
            }
        });

        return NextResponse.json(commuteLocation);
    } catch (error) {
        console.log('[COMMUTE_POST]', error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return NextResponse.error();
        }

        const locations = await prisma.commuteLocation.findMany({
            where: {
                userId: currentUser.id
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(locations);
    } catch (error) {
        console.log('[COMMUTE_GET]', error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return NextResponse.error();
        }

        const body = await request.json();
        const { id } = body;

        if (!id) {
            return new NextResponse("Missing ID", { status: 400 });
        }

        const deletedLocation = await prisma.commuteLocation.deleteMany({
            where: {
                id: id,
                userId: currentUser.id // Security check
            }
        });

        return NextResponse.json(deletedLocation);
    } catch (error) {
        console.log('[COMMUTE_DELETE]', error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
