import getCurrentUser from "@/app/actions/getCurrentUser";
import { redirect } from "next/navigation";
import UserDetailClient from "./UserDetailClient";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
        redirect('/');
    }
    return <UserDetailClient userId={userId} currentUser={{ id: currentUser.id }} />;
}
