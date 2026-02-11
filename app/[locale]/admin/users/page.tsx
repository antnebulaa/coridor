
import getCurrentUser from "@/app/actions/getCurrentUser";
import { redirect } from "next/navigation";
import prisma from "@/libs/prismadb";
import UserManagementClient from "./UserManagementClient";

export default async function AdminUsersPage() {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== 'ADMIN') {
        redirect('/');
    }

    const users = await prisma.user.findMany({
        orderBy: {
            createdAt: 'desc'
        }
    });

    const safeUsers = users.map((user) => ({
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        emailVerified: user.emailVerified?.toISOString() || null,
        birthDate: user.birthDate?.toISOString() || null,
        // We don't need all relations for the list view
        // Adding role and isBanned to safeUser manually if not in type yet?
        // SafeUser has been updated? No, let's verify. 
        // If not, we might need to cast or update type.
        // We added role, but isBanned is new.
        isBanned: (user as any).isBanned || false
    }));

    return <UserManagementClient users={safeUsers} currentUser={currentUser} />;
}
