import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

const getUnreadMessageCount = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
        return 0;
    }

    try {
        const count = await prisma.message.count({
            where: {
                conversation: {
                    users: {
                        some: {
                            id: currentUser.id
                        }
                    }
                },
                senderId: {
                    not: currentUser.id
                },
                seen: {
                    none: {
                        id: currentUser.id
                    }
                }
            }
        });

        return count;
    } catch (error: any) {
        return 0;
    }
};

export default getUnreadMessageCount;
