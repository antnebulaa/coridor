import prisma from "@/libs/prismadb";
import { DocumentService } from "@/services/DocumentService";

const getMessages = async (
    conversationId: string
) => {
    try {
        const messages = await prisma.message.findMany({
            where: {
                conversationId: conversationId
            },
            include: {
                sender: {
                    select: { id: true, name: true, email: true, image: true }
                },
                seen: {
                    select: { id: true, email: true }
                },
                documents: {
                    select: {
                        id: true,
                        fileName: true,
                        fileType: true,
                        fileSize: true,
                        fileUrl: true,
                        storagePath: true,
                        label: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        // Resolve signed URLs for documents stored in Supabase
        const resolvedMessages = await Promise.all(
            messages.map(async (message: any) => {
                // Resolve document URLs
                if (message.documents?.length > 0) {
                    message.documents = await Promise.all(
                        message.documents.map(async (doc: any) => ({
                            ...doc,
                            fileUrl: await DocumentService.resolveFileUrl(doc),
                        }))
                    );
                }

                // Resolve inline image/file URLs if they have a matching document with storagePath
                if (message.image || message.fileUrl) {
                    const docWithPath = message.documents?.find(
                        (d: any) => d.storagePath
                    );
                    if (docWithPath) {
                        const resolvedUrl = await DocumentService.getSignedUrl(docWithPath.storagePath);
                        if (resolvedUrl) {
                            if (message.image) message.image = resolvedUrl;
                            if (message.fileUrl) message.fileUrl = resolvedUrl;
                        }
                    }
                }

                if (!message.listing) return message;

                const listing = message.listing;
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
                const aggregatedImages = allImages.filter(img => {
                    if (uniqueUrls.has(img.url)) return false;
                    uniqueUrls.add(img.url);
                    return true;
                });

                return {
                    ...message,
                    listing: {
                        ...listing,
                        images: aggregatedImages
                    }
                };
            })
        );

        return resolvedMessages;
    } catch (error: any) {
        return [];
    }
};

export default getMessages;
