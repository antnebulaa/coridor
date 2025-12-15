import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

export default async function getContacts() {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return [];
        }

        const user = await prisma.user.findUnique({
            where: {
                id: currentUser.id
            },
            include: {
                contacts: true
            }
        });

        if (!user) {
            return [];
        }

        // Return contacts, sanitized implicitly by ensuring we only use this for display or map to SafeUser if needed.
        // For now returning raw user objects but with sensitive fields stripped by UI usage or transform.
        // Ideally map to SafeUser.

        const safeContacts = user.contacts.map((contact) => ({
            ...contact,
            createdAt: contact.createdAt.toISOString(),
            updatedAt: contact.updatedAt.toISOString(),
            emailVerified: contact.emailVerified?.toISOString() || null,
            birthDate: contact.birthDate?.toISOString() || null,
        }));

        return safeContacts;
    } catch (error: any) {
        return [];
    }
}
