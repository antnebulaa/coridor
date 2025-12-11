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
            message,
            image,
            conversationId,
            listingId
        } = body;

        if (!currentUser?.id || !currentUser?.email) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const newMessage = await prisma.message.create({
            data: {
                body: message,
                image: image,
                conversation: {
                    connect: {
                        id: conversationId
                    }
                },
                sender: {
                    connect: {
                        id: currentUser.id
                    }
                },
                seen: {
                    connect: {
                        id: currentUser.id
                    }
                },
                ...(listingId && {
                    listing: {
                        connect: { id: listingId }
                    }
                })
            },
            include: {
                seen: true,
                sender: true,
                listing: true
            }
        });

        const updatedConversation = await prisma.conversation.update({
            where: {
                id: conversationId
            },
            data: {
                lastMessageAt: new Date(),
                messages: {
                    connect: {
                        id: newMessage.id
                    }
                }
            },
            include: {
                users: true,
                messages: {
                    include: {
                        seen: true
                    }
                }
            }
        });

        // Update application status if it's a visit invitation
        if (message === 'INVITATION_VISITE' && listingId) {
            const application = await prisma.rentalApplication.findFirst({
                where: {
                    propertyId: listingId,
                    candidateScope: {
                        creatorUserId: (await prisma.conversation.findUnique({
                            where: { id: conversationId },
                            include: { users: true }
                        }))?.users.find(u => u.id !== currentUser.id)?.id
                    }
                }
            });

            if (application) {
                await prisma.rentalApplication.update({
                    where: { id: application.id },
                    data: { status: 'VISIT_PROPOSED' }
                });
            }
        }

        return NextResponse.json(newMessage);
    } catch (error: any) {
        console.log(error, 'ERROR_MESSAGES');
        return new NextResponse('InternalError', { status: 500 });
    }
}
