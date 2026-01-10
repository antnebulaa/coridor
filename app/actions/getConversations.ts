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
                        rentalUnit: {
                            include: {
                                property: {
                                    include: {
                                        owner: true
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

        return conversations;
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
