import { redirect } from "next/navigation";
import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import PreferencesClient from "./PreferencesClient";

const PreferencesPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect('/');
    }

    return (
        <ClientOnly>
            <PreferencesClient currentUser={currentUser} />
        </ClientOnly>
    );
}

export default PreferencesPage;
