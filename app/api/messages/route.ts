import { NextResponse, NextRequest } from "next/server";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { broadcastNewMessage } from "@/lib/supabaseServer";
import webPush from "web-push";
import getMessages from "@/app/actions/getMessages";

/**
 * GET /api/messages?conversationId=X&cursor=Y&limit=Z
 * Cursor-based pagination for loading older messages on scroll up.
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { searchParams } = request.nextUrl;
        const conversationId = searchParams.get('conversationId');
        const cursor = searchParams.get('cursor') || undefined;
        const limit = parseInt(searchParams.get('limit') || '50', 10);

        if (!conversationId) {
            return new NextResponse('Missing conversationId', { status: 400 });
        }

        // Verify user is a participant of this conversation
        const conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationId,
                users: { some: { id: user.id } },
            },
            select: { id: true }
        });

        if (!conversation) {
            return new NextResponse('Not found', { status: 404 });
        }

        const result = await getMessages({
            conversationId,
            cursor,
            limit: Math.min(limit, 100), // Cap at 100
        });

        // Serialize dates for client
        // Note: messageInclude selects minimal sender (id,name,email,image) and seen (id,email)
        const safeMessages = result.messages.map((message: any) => ({
            ...message,
            createdAt: message.createdAt instanceof Date
                ? message.createdAt.toISOString()
                : message.createdAt,
        }));

        return NextResponse.json({
            messages: safeMessages,
            hasMore: result.hasMore,
            nextCursor: result.nextCursor,
        });
    } catch (error: any) {
        console.error('[API Messages GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

/** Convert pipe-delimited system message bodies to human-readable text for notifications */
function formatSystemMessage(body: string | null): string | null {
    if (!body) return body;
    if (body === 'LEASE_SENT_FOR_SIGNATURE') return 'Bail envoyé pour signature';
    if (body === 'INVITATION_VISITE') return 'Invitation à une visite';
    if (body.startsWith('VISIT_CONFIRMED|')) return 'Visite confirmée';
    if (body.startsWith('APPLICATION_REJECTED|')) return 'Candidature déclinée';
    if (body.startsWith('INSPECTION_SCHEDULED|')) return "État des lieux planifié";
    if (body.startsWith('INSPECTION_CONFIRMED|')) return "Créneau EDL confirmé";
    if (body.startsWith('INSPECTION_REMINDER|')) return "Rappel état des lieux";
    if (body.startsWith('INSPECTION_STARTED|')) return "État des lieux démarré";
    if (body.startsWith('INSPECTION_COMPLETED|')) return "Le bailleur a signé l'état des lieux";
    if (body.startsWith('INSPECTION_SIGNED|')) return "État des lieux signé par les deux parties";
    if (body.startsWith('INSPECTION_SIGN_LINK_SENT|')) return "Lien de signature envoyé";
    if (body.startsWith('INSPECTION_PDF_READY|')) return "PDF de l'état des lieux disponible";
    if (body.startsWith('INSPECTION_CANCELLED|')) return "État des lieux annulé";
    if (body.startsWith('INSPECTION_RESCHEDULED|')) return "État des lieux reprogrammé";
    if (body.startsWith('INSPECTION_AMENDMENT_REQUESTED|')) return "Rectification demandée sur l'état des lieux";
    if (body.startsWith('INSPECTION_AMENDMENT_RESPONDED|')) {
        const status = body.split('|')[3];
        return status === 'ACCEPTED' ? 'Rectification acceptée' : 'Rectification refusée';
    }
    return body;
}

// Configure VAPID keys safely
try {
    if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webPush.setVapidDetails(
            process.env.NEXT_PUBLIC_VAPID_EMAIL || "mailto:admin@example.com",
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );
    } else {
        console.warn("VAPID keys are missing. Push notifications will not work.");
    }
} catch (error) {
    console.error("Failed to set VAPID details:", error);
}

export async function POST(
    request: Request
) {
    try {
        const user = await getCurrentUser();
        const body = await request.json();
        const {
            message,
            image,
            fileUrl,
            fileName,
            fileType,
            fileSize,
            fileMimeType,
            fileLabel,
            storagePath,
            conversationId,
            listingId
        } = body;

        if (!user?.id || !user?.email) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const newMessage = await prisma.message.create({
            data: {
                body: message,
                image: image,
                fileUrl: fileUrl,
                fileName: fileName,
                fileType: fileType,
                conversation: {
                    connect: {
                        id: conversationId
                    }
                },
                sender: {
                    connect: {
                        id: user.id
                    }
                },
                seen: {
                    connect: {
                        id: user.id
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

        // Index file as ConversationDocument (non-blocking)
        // Images use { image: url }, files use { fileUrl: url } — handle both
        const actualFileUrl = image || fileUrl;
        if (actualFileUrl && fileMimeType && fileSize) {
            try {
                const { DocumentService } = await import("@/services/DocumentService");
                await DocumentService.createUserDocument({
                    conversationId,
                    messageId: newMessage.id,
                    uploadedById: user.id,
                    fileName: fileName || "fichier",
                    fileType: fileMimeType,
                    fileSize: fileSize,
                    fileUrl: actualFileUrl,
                    storagePath: storagePath || undefined,
                    label: fileLabel || undefined,
                });
            } catch (docError) {
                console.error("[DocumentService] Failed to index document:", docError);
            }
        }

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
                        }))?.users.find((u: any) => u.id !== user!.id)?.id
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
            senderId: user.id,
            body: newMessage.body,
            createdAt: newMessage.createdAt
        }).catch(err => console.error("[Background Broadcast] Failed:", err));

        // SEND PUSH NOTIFICATION (Parallel-ish)
        const recipientUser = updatedConversation.users.find((u: any) => u.id !== user.id);

        if (recipientUser) {
            // Create In-App Notification
            const { createNotification } = await import('@/libs/notifications');
            await createNotification({
                userId: recipientUser.id,
                type: 'MESSAGE',
                title: user.name || 'Nouveau message',
                message: formatSystemMessage(newMessage.body) || (newMessage.image ? "📷 Photo envoyée" : (newMessage.fileUrl ? "📎 Fichier envoyé" : "Nouveau message")),
                link: `/inbox/${conversationId}`
            });

            console.log(`[Push] Attempting to notify user ${recipientUser.id} (${recipientUser.name || 'Unknown'})`);

            // Fire and forget - don't await this block
            (async () => {
                try {
                    const subscriptions = await prisma.pushSubscription.findMany({
                        where: { userId: recipientUser.id }
                    });

                    console.log(`[Push] Found ${subscriptions.length} subscriptions for user ${recipientUser.id}`);

                    if (subscriptions.length > 0) {
                        const notificationPayload = JSON.stringify({
                            title: `Nouveau message de ${user.name || 'Coridor'}`,
                            body: formatSystemMessage(newMessage.body) || (newMessage.image ? "📷 Photo envoyée" : (newMessage.fileUrl ? "📎 Fichier envoyé" : "Nouveau message")),
                            url: `/inbox/${conversationId}`,
                            icon: "/images/logo.png"
                        });

                        const results = await Promise.allSettled(subscriptions.map(async (sub) => {
                            try {
                                await webPush.sendNotification({
                                    endpoint: sub.endpoint,
                                    keys: sub.keys as any
                                }, notificationPayload);
                                return { status: 'fulfilled', id: sub.id };
                            } catch (error: any) {
                                console.error(`[Push] Failed for sub ${sub.id}:`, error.statusCode, error.message);
                                if (error.statusCode === 410 || error.statusCode === 404) {
                                    console.log(`[Push] Deleting expired subscription ${sub.id}`);
                                    await prisma.pushSubscription.delete({ where: { id: sub.id } });
                                }
                                throw error;
                            }
                        }));

                        const fulfilled = results.filter(r => r.status === 'fulfilled').length;
                        console.log(`[Push] Successfully sent to ${fulfilled}/${subscriptions.length} devices.`);
                    }
                } catch (pushError) {
                    console.error("[Push] Global Error:", pushError);
                }
            })();
        } else {
            console.log("[Push] No recipient found in conversation.");
        }

        console.log("[API Messages] Response sent to client immediately");

        return NextResponse.json(safeMessage);
    } catch (error: any) {
        console.log(error, 'ERROR_MESSAGES');
        return new NextResponse('InternalError', { status: 500 });
    }
}
