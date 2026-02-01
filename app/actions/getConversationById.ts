import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

const getConversationById = async (
    conversationId: string
) => {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser?.email) {
            return null;
        }

        const conversation = await prisma.conversation.findUnique({
            where: {
                id: conversationId
            },
            include: {
                users: {
                    include: {
                        createdScopes: true,
                        tenantProfile: {
                            include: {
                                guarantors: {
                                    include: {
                                        additionalIncomes: true
                                    }
                                },
                                additionalIncomes: true
                            }
                        }
                    }
                },
                listing: {
                    include: {
                        rentalUnit: {
                            include: {
                                images: true,
                                targetRoom: {
                                    include: {
                                        images: true
                                    }
                                },
                                property: {
                                    include: {
                                        images: true, // Reduced recursion
                                        owner: true,
                                    }
                                }
                            }
                        },
                        // user: true,
                        // visitSlots: removed from here
                    }
                }
            }
        });

        return conversation;
    } catch (error: any) {
        return null;
    }
};

export default getConversationById;
