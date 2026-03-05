import prisma from "@/libs/prismadb";

/**
 * Find the conversation between two users for a given listing.
 * Reusable utility for auto-indexing Coridor documents.
 */
export async function findConversationByListingAndUsers(
    listingId: string,
    userIds: string[]
): Promise<string | null> {
    const conversation = await prisma.conversation.findFirst({
        where: {
            listingId,
            AND: userIds.map(uid => ({
                users: { some: { id: uid } },
            })),
        },
        select: { id: true },
    });
    return conversation?.id || null;
}
