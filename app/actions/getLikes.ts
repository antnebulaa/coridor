import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

export default async function getLikes() {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return [];
        }

        const likes = await prisma.like.findMany({
            where: {
                userId: currentUser.id
            }
        });

        // Return IDs of liked listings
        return likes.map((like) => like.listingId);
    } catch (error: any) {
        return [];
    }
}
