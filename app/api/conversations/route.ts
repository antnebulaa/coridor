import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function POST(
    request: Request
) {
    try {
        const currentUser = await getCurrentUser();
        const body = await request.json();
        const {
            userId,
            isGroup,
            members,
            name
        } = body;

        if (!currentUser?.id || !currentUser?.email) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        if (isGroup && (!members || members.length < 2 || !name)) {
            return new NextResponse('Invalid data', { status: 400 });
        }

        if (isGroup) {
            const newConversation = await prisma.conversation.create({
                data: {
                    name,
                    isGroup,
                    users: {
                        connect: [
                            ...members.map((member: { value: string }) => ({
                                id: member.value
                            })),
                            {
                                id: currentUser.id
                            }
                        ]
                    }
                },
                include: {
                    users: true
                }
            });

            return NextResponse.json(newConversation);
        }

        const existingConversations = await prisma.conversation.findMany({
            where: {
                OR: [
                    {
                        users: {
                            every: {
                                id: {
                                    in: [currentUser.id, userId]
                                }
                            }
                        }
                    }
                ]
            }
        });

        const singleConversation = existingConversations[0];

        if (singleConversation) {
            return NextResponse.json(singleConversation);
        }

        const newConversation = await prisma.conversation.create({
            data: {
                users: {
                    connect: [
                        {
                            id: currentUser.id
                        },
                        {
                            id: userId
                        }
                    ]
                }
            },
            include: {
                users: true
            }
        });

        return NextResponse.json(newConversation);
    } catch (error: any) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function GET(
    request: Request
) {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser?.id) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const conversations = await prisma.conversation.findMany({
            orderBy: {
                lastMessageAt: 'desc'
            },
            where: {
                users: {
                    some: {
                        id: currentUser.id
                    }
                }
            },
            include: {
                users: true,
                messages: {
                    include: {
                        seen: true,
                        sender: true
                    }
                }
            }
        });

        return NextResponse.json(conversations);
    } catch (error: any) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}
