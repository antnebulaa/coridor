import { NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

interface IParams {
    conversationId?: string;
}

export async function POST(
    request: Request,
    props: { params: Promise<IParams> }
) {
    try {
        const currentUser = await getCurrentUser();
        const params = await props.params;
        const {
            conversationId
        } = params;

        if (!currentUser?.id || !currentUser?.email) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Find the existing conversation with all messages
        const conversation = await prisma.conversation.findUnique({
            where: {
                id: conversationId
            },
            include: {
                messages: {
                    include: {
                        seen: true
                    }
                },
                users: true,
            }
        });

        if (!conversation) {
            return new NextResponse('Invalid ID', { status: 400 });
        }

        // Find all messages NOT seen by current user
        const unseenMessages = conversation.messages.filter(
            (msg) => !msg.seen.some((user) => user.id === currentUser.id)
        );

        if (unseenMessages.length === 0) {
            return NextResponse.json({ message: 'All messages already seen' });
        }

        // Mark ALL unseen messages as seen by the current user
        // Using Promise.all with individual updates since updateMany doesn't support relation connections
        await Promise.all(
            unseenMessages.map((msg) =>
                prisma.message.update({
                    where: { id: msg.id },
                    data: {
                        seen: {
                            connect: { id: currentUser.id }
                        }
                    }
                })
            )
        );

        return NextResponse.json({
            message: `Marked ${unseenMessages.length} messages as seen`
        });
    } catch (error: any) {
        console.log(error, 'ERROR_MESSAGES_SEEN');
        return new NextResponse("Internal Error", { status: 500 });
    }
}

