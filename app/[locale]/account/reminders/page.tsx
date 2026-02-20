import { redirect } from "next/navigation";
import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import RemindersClient from "./RemindersClient";

const RemindersPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect('/');
    }

    return (
        <ClientOnly>
            <RemindersClient />
        </ClientOnly>
    );
}

export default RemindersPage;
