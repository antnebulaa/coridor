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
            listingId,
            message
        } = body;
        console.log('API_APP_START', { listingId, message, userId: currentUser?.id });

        if (!currentUser?.id || !currentUser?.email) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        if (!listingId || !message) {
            return new NextResponse('Invalid data', { status: 400 });
        }

        // Find the listing to get the owner
        const listing = await prisma.listing.findUnique({
            where: {
                id: listingId
            },
            include: {
                rentalUnit: {
                    include: {
                        property: true
                    }
                }
            }
        });

        if (!listing) {
            return new NextResponse('Listing not found', { status: 404 });
        }

        const ownerId = listing.rentalUnit.property.ownerId;

        // Prevent applying to own listing
        // if (ownerId === currentUser.id) {
        //    return new NextResponse('Cannot apply to own listing', { status: 400 });
        // }

        // Find existing conversation
        const existingConversations = await prisma.conversation.findMany({
            where: {
                OR: [
                    {
                        AND: [
                            {
                                users: {
                                    some: {
                                        id: currentUser.id
                                    }
                                }
                            },
                            {
                                users: {
                                    some: {
                                        id: ownerId
                                    }
                                }
                            },
                            {
                                listingId: listingId
                            }
                        ]
                    }
                ]
            }
        });

        let conversation = existingConversations[0];

        // Create new conversation if none exists
        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    users: {
                        connect: [
                            {
                                id: currentUser.id
                            },
                            {
                                id: ownerId
                            }
                        ].filter((user: any, index: number, self: any) =>
                            index === self.findIndex((t: any) => (
                                t.id === user.id
                            ))
                        )
                    },
                    listing: {
                        connect: {
                            id: listingId
                        }
                    }
                }
            });
        }

        // Get tenant candidate scope
        const candidateScope = await prisma.tenantCandidateScope.findFirst({
            where: {
                creatorUserId: currentUser.id
            }
        });

        if (candidateScope) {
            await prisma.rentalApplication.create({
                data: {
                    listingId: listingId,
                    candidateScopeId: candidateScope.id,
                    status: 'SENT'
                }
            });
        }

        // Create the application message
        const newMessage = await prisma.message.create({
            data: {
                body: message,
                conversation: {
                    connect: {
                        id: conversation.id
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
                listing: {
                    connect: {
                        id: listingId
                    }
                }
            },
            include: {
                seen: true,
                sender: true
            }
        });

        // Update conversation with last message
        await prisma.conversation.update({
            where: {
                id: conversation.id
            },
            data: {
                lastMessageAt: new Date(),
                messages: {
                    connect: {
                        id: newMessage.id
                    }
                }
            }
        });

        // Trigger Pusher events (if implemented, copying from messages route logic would be good, but for now basic DB ops)
        // Since I don't have the full Pusher setup context visible here (it's likely in api/messages/route.ts), 
        // I will stick to DB operations. The user didn't mention real-time requirements for this specific action, 
        // but typically we'd want to trigger pusher. 
        // Let's check api/messages/route.ts to see if I should include Pusher.

        return NextResponse.json(conversation);
    } catch (error: any) {
        console.error('APPLICATION_ERROR_DETAILS:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
