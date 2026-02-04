import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

const getUnreadMessageCount = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
        return 0;
    }

    try {
        // Count CONVERSATIONS with unread messages, not individual messages
        const unreadConversationsCount = await prisma.conversation.count({
            where: {
                users: {
                    some: {
                        id: currentUser.id
                    }
                },
                messages: {
                    some: {
                        senderId: {
                            not: currentUser.id
                        },
                        seen: {
                            none: {
                                id: currentUser.id
                            }
                        }
                    }
                }
            }
        });

        console.log(`[getUnreadMessageCount] User ${currentUser.id} has ${unreadConversationsCount} unread conversations`);
        return unreadConversationsCount;
    } catch (error: any) {
        console.error("[getUnreadMessageCount] Error:", error);
        return 0;
    }
};

export default getUnreadMessageCount;
