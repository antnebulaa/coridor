import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { broadcastNewMessage } from "@/lib/supabaseServer";

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
                listing: {
                    include: {
                        rentalUnit: {
                            include: {
                                property: {
                                    include: {
                                        owner: true,
                                        images: {
                                            include: {
                                                room: true
                                            }
                                        },
                                        rooms: {
                                            include: {
                                                images: true
                                            }
                                        }
                                    }
                                },
                                images: true,
                                targetRoom: {
                                    include: {
                                        images: true
                                    }
                                }
                            }
                        }
                    }
                }
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
                    listingId: listingId,
                    candidateScope: {
                        creatorUserId: (await prisma.conversation.findUnique({
                            where: { id: conversationId },
                            include: { users: true }
                        }))?.users.find((u: any) => u.id !== currentUser.id)?.id
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

        // Map images for the immediate response
        const safeMessage = { ...newMessage } as any;
        if (safeMessage.listing) {
            const listing = safeMessage.listing;
            const unitImages = listing.rentalUnit?.images || [];
            const targetRoomImages = listing.rentalUnit?.targetRoom?.images || [];

            const targetRoomId = listing.rentalUnit?.targetRoom?.id;
            const propertyImagesRaw = listing.rentalUnit?.property?.images || [];

            const propertyImages = propertyImagesRaw.filter((img: any) => {
                if (!img.roomId) return true;
                if (img.roomId === targetRoomId) return true;
                return img.room && !img.room.name.toLowerCase().startsWith('chambre');
            });

            const allImages = [...unitImages, ...targetRoomImages, ...propertyImages];
            const uniqueUrls = new Set();
            const aggregatedImages = allImages.filter((img: any) => {
                if (uniqueUrls.has(img.url)) return false;
                uniqueUrls.add(img.url);
                return true;
            });

            safeMessage.listing.images = aggregatedImages;
        }

        // Broadcast to conversation participants for realtime updates (Fire and Forget)
        const recipientIds = updatedConversation.users.map((u: any) => u.id);
        console.log(`[API Messages] Triggering background broadcast to ${recipientIds.length} recipients`);

        // Do NOT await this, let it run in background so API responds instantly
        broadcastNewMessage(conversationId, recipientIds, {
            id: newMessage.id,
            conversationId: conversationId,
            senderId: currentUser.id,
            body: newMessage.body,
            createdAt: newMessage.createdAt
        }).catch(err => console.error("[Background Broadcast] Failed:", err));

        console.log("[API Messages] Response sent to client immediately");

        return NextResponse.json(safeMessage);
    } catch (error: any) {
        console.log(error, 'ERROR_MESSAGES');
        return new NextResponse('InternalError', { status: 500 });
    }
}
