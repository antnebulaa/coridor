import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";

interface IParams {
    code?: string;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<IParams> }
) {
    const { code } = await params;

    if (!code) {
        return new NextResponse('Code required', { status: 400 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: {
                uniqueCode: code
            },
            select: {
                id: true,
                name: true,
                image: true,
                uniqueCode: true
            }
        });

        if (!user) {
            return new NextResponse('User not found', { status: 404 });
        }

        const session = await getServerSession(authOptions);
        let isSelf = false;
        let isContact = false;

        if (session?.user?.email) {
            const currentUser = await prisma.user.findUnique({
                where: {
                    email: session.user.email
                },
                include: {
                    contacts: {
                        select: {
                            id: true
                        }
                    }
                }
            });

            if (currentUser) {
                isSelf = currentUser.id === user.id;
                isContact = currentUser.contacts.some((contact: any) => contact.id === user.id);
            }
        }

        return NextResponse.json({
            ...user,
            isSelf,
            isContact
        });
    } catch (error) {
        console.error('USER_CODE_GET_ERROR', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
