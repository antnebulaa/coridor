import getCurrentUser from "@/app/actions/getCurrentUser";
import { redirect } from "next/navigation";
import UserManagementClient from "./UserManagementClient";

export default async function AdminUsersPage() {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
        redirect('/');
    }
    return <UserManagementClient currentUser={{ id: currentUser.id, role: currentUser.role }} />;
}
