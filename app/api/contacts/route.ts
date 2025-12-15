import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

export async function POST(request: Request) {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await request.json();
        const { code } = body;

        if (!code) {
            return new NextResponse('Code required', { status: 400 });
        }

        // 1. Find the target user by uniqueCode
        const targetUser = await prisma.user.findUnique({
            where: {
                uniqueCode: code
            }
        });

        if (!targetUser) {
            return new NextResponse('User not found', { status: 404 });
        }

        if (targetUser.id === currentUser.id) {
            return new NextResponse('Cannot add yourself', { status: 400 });
        }

        // 2. Add to contacts
        const updatedUser = await prisma.user.update({
            where: {
                id: currentUser.id
            },
            data: {
                contacts: {
                    connect: {
                        id: targetUser.id
                    }
                }
            },
            include: {
                contacts: true
            }
        });

        return NextResponse.json(updatedUser.contacts);
    } catch (error) {
        console.error('CONTACT_POST_ERROR', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const userWithContacts = await prisma.user.findUnique({
            where: {
                id: currentUser.id
            },
            include: {
                contacts: true
            }
        });

        return NextResponse.json(userWithContacts?.contacts || []);
    } catch (error) {
        console.error('CONTACT_GET_ERROR', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
