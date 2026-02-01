import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

const getConversations = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
        return [];
    }

    try {
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
                users: {
                    include: {
                        createdScopes: {
                            include: {
                                applications: true
                            }
                        }
                    }
                },
                listing: {
                    include: {
                        include: {
                            rentalUnit: {
                                include: {
                                    property: {
                                        include: {
                                            owner: true,
                                            images: true // Reduced recursion
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
                },
                messages: {
                    include: {
                        sender: true,
                        seen: true
                    }
                }
            }
        });

        const safeConversations = conversations.map((conversation: any) => {
            const listing = conversation.listing;
            if (!listing) return conversation;

            const unitImages = listing.rentalUnit?.images || [];
            const targetRoomImages = listing.rentalUnit?.targetRoom?.images || [];

            const targetRoomId = listing.rentalUnit?.targetRoom?.id;
            const propertyImagesRaw = listing.rentalUnit?.property?.images || [];

            const propertyImages = propertyImagesRaw.filter((img: any) => {
                if (!img.roomId) return true;
                if (img.roomId === targetRoomId) return true;
                return img.room && !img.room.name.toLowerCase().startsWith('chambre');
            });

            const rooms = listing.rentalUnit.property.rooms || [];
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
                ...conversation,
                listing: {
                    ...listing,
                    images: aggregatedImages
                }
            };
        });

        return safeConversations;
    } catch (error: any) {
        console.error("GET_CONVERSATIONS_ERROR", error);
        // Fallback: Fetch conversations without deep listing relations to avoid crash on data integrity issues
        try {
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
                    users: {
                        include: {
                            createdScopes: {
                                include: {
                                    applications: true
                                }
                            }
                        }
                    },
                    listing: true, // Shallow fetch
                    messages: {
                        include: {
                            sender: true,
                            seen: true
                        }
                    }
                }
            });
            return conversations as any;
        } catch (fallbackError) {
            return [];
        }
    }
};

export default getConversations;
