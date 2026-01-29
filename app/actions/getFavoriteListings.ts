import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

export default async function getFavoriteListings() {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return [];
        }

        const favorites = await prisma.listing.findMany({
            where: {
                id: {
                    in: [...(currentUser.favoriteIds || [])]
                }
            },
            include: {
                rentalUnit: {
                    include: {
                        property: {
                            include: {
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
                        targetRoom: {
                            include: {
                                images: true
                            }
                        }
                    }
                }
            }
        });

        const safeFavorites = favorites.map((favorite: any) => {
            const unitImages = favorite.rentalUnit?.images || [];
            const targetRoomImages = favorite.rentalUnit?.targetRoom?.images || [];

            const targetRoomId = favorite.rentalUnit?.targetRoom?.id;
            const propertyImagesRaw = favorite.rentalUnit?.property?.images || [];

            const propertyImages = propertyImagesRaw.filter((img: any) => {
                if (!img.roomId) return true;
                if (img.roomId === targetRoomId) return true;
                return img.room && !img.room.name.toLowerCase().startsWith('chambre');
            });

            const rooms = favorite.rentalUnit?.property?.rooms || [];
            const roomsImages = rooms.flatMap((room: any) => {
                if (room.id !== targetRoomId && room.name.toLowerCase().startsWith('chambre')) {
                    return [];
                }
                return room.images || [];
            });

            const allImages = [...unitImages, ...targetRoomImages, ...propertyImages, ...roomsImages];
            const uniqueUrls = new Set();
            const aggregatedImages = allImages.filter(img => {
                if (uniqueUrls.has(img.url)) return false;
                uniqueUrls.add(img.url);
                return true;
            });

            return {
                ...favorite,
                createdAt: favorite.createdAt.toISOString(),
                statusUpdatedAt: favorite.statusUpdatedAt.toISOString(),
                images: aggregatedImages
            };
        });

        return safeFavorites;
    } catch (error: any) {
        throw new Error(error);
    }
}
