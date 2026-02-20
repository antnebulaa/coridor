import { redirect } from "next/navigation";
import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import AlertsClient from "./AlertsClient";

const AlertsPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect('/');
    }

    return (
        <ClientOnly>
            <AlertsClient currentUser={currentUser} />
        </ClientOnly>
    );
}

export default AlertsPage;
