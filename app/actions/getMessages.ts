import prisma from "@/libs/prismadb";

const getMessages = async (
    conversationId: string
) => {
    try {
        const messages = await prisma.message.findMany({
            where: {
                conversationId: conversationId
            },
            include: {
                sender: true,
                seen: true
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        const safeMessages = messages.map((message: any) => {
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
        });

        return safeMessages;
    } catch (error: any) {
        return [];
    }
};

export default getMessages;
