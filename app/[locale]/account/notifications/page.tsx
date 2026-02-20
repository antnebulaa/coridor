import { redirect } from "next/navigation";
import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import NotificationsClient from "./NotificationsClient";

const NotificationsPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect('/');
    }

    return (
        <ClientOnly>
            <NotificationsClient currentUser={currentUser} />
        </ClientOnly>
    );
}

export default NotificationsPage;
