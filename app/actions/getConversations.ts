import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

const getConversations = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
        return [];
    }

    try {
        const conversations = await prisma.conversation.findMany({
            take: 30,
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
                                applications: {
                                    take: 3,
                                }
                            }
                        }
                    }
                },
                listing: {
                    include: {
                        rentalUnit: {
                            include: {
                                property: {
                                    include: {
                                        owner: {
                                            select: { id: true, name: true, image: true }
                                        },
                                        images: {
                                            take: 3,
                                            select: { id: true, url: true, roomId: true }
                                        }
                                    }
                                },
                                images: {
                                    take: 3,
                                    select: { id: true, url: true }
                                },
                                targetRoom: {
                                    include: {
                                        images: {
                                            take: 3,
                                            select: { id: true, url: true }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                messages: {
                    take: 30,
                    orderBy: {
                        createdAt: 'desc'
                    },
                    select: {
                        id: true,
                        body: true,
                        image: true,
                        createdAt: true,
                        listingId: true,
                        senderId: true,
                        sender: {
                            select: { id: true, name: true, email: true, image: true }
                        },
                        seen: {
                            select: { id: true, email: true }
                        }
                    }
                },
                _count: {
                    select: {
                        messages: {
                            where: {
                                NOT: { seen: { some: { id: currentUser.id } } }
                            }
                        }
                    }
                }
            }
        });

        // Reverse messages back to chronological order (fetched desc for take: 30)
        for (const conv of conversations) {
            (conv as any).messages.reverse();
        }

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
                take: 30,
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
                                    applications: { take: 3, orderBy: { createdAt: 'desc' } }
                                }
                            }
                        }
                    },
                    listing: true, // Shallow fetch
                    messages: {
                        take: 30,
                        orderBy: {
                            createdAt: 'desc'
                        },
                        select: {
                            id: true,
                            body: true,
                            image: true,
                            createdAt: true,
                            listingId: true,
                            senderId: true,
                            sender: {
                                select: { id: true, name: true, email: true, image: true }
                            },
                            seen: {
                                select: { id: true, email: true }
                            }
                        }
                    }
                }
            });
            // Reverse messages back to chronological order
            for (const conv of conversations) {
                (conv as any).messages.reverse();
            }
            return conversations as any;
        } catch (fallbackError) {
            return [];
        }
    }
};

export default getConversations;
