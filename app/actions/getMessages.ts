import prisma from "@/libs/prismadb";
import { DocumentService } from "@/services/DocumentService";

export const MESSAGES_PER_PAGE = 50;

interface GetMessagesOptions {
    conversationId: string;
    limit?: number;
    cursor?: string; // ID of the oldest message currently loaded — fetch older ones
}

interface GetMessagesResult {
    messages: any[];
    hasMore: boolean;
    nextCursor: string | null; // ID of the oldest message in this batch
}

const resolveMessageData = async (message: any) => {
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
};

const messageInclude = {
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
};

/**
 * Fetch messages with cursor-based pagination.
 * Returns the most recent messages first (when no cursor),
 * or older messages before the cursor.
 * Messages are always returned in chronological order (oldest first).
 */
const getMessages = async (
    options: string | GetMessagesOptions
): Promise<GetMessagesResult> => {
    // Backwards-compatible: accept string for conversationId
    const {
        conversationId,
        limit = MESSAGES_PER_PAGE,
        cursor,
    } = typeof options === 'string'
        ? { conversationId: options }
        : options;

    try {
        // Fetch limit + 1 to determine if there are more messages
        const take = limit + 1;

        const messages = await prisma.message.findMany({
            where: {
                conversationId: conversationId
            },
            include: messageInclude,
            orderBy: {
                createdAt: 'desc' // Newest first — we'll reverse after
            },
            take,
            ...(cursor ? {
                skip: 1, // Skip the cursor message itself
                cursor: { id: cursor }
            } : {})
        });

        const hasMore = messages.length > limit;
        if (hasMore) {
            messages.pop(); // Remove the extra message used for hasMore check
        }

        // Reverse to chronological order (oldest first)
        messages.reverse();

        // Resolve signed URLs and aggregate images
        const resolvedMessages = await Promise.all(
            messages.map(resolveMessageData)
        );

        const nextCursor = resolvedMessages.length > 0
            ? resolvedMessages[0].id // Oldest message in this batch
            : null;

        return {
            messages: resolvedMessages,
            hasMore,
            nextCursor,
        };
    } catch (error: any) {
        console.error('[getMessages] Failed:', error);
        return { messages: [], hasMore: false, nextCursor: null };
    }
};

export default getMessages;
