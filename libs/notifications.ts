
import prisma from "@/libs/prismadb";

export async function createNotification({
    userId,
    type,
    title,
    message,
    link
}: {
    userId: string;
    type: string;
    title: string;
    message: string;
    link?: string;
}) {
    try {
        const notification = await prisma.notification.create({
            data: {
                userId,
                type,
                title,
                message,
                link,
                isRead: false
            }
        });
        return notification;
    } catch (error) {
        console.error("FAILED_TO_CREATE_NOTIFICATION", error);
        return null;
    }
}
