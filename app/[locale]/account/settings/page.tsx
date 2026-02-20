import ClientOnly from "@/components/ClientOnly";
import SettingsClient from "@/components/account/SettingsClient";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { redirect } from 'next/navigation';

const SettingsPage = async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser) { redirect('/'); }

    return (
        <ClientOnly>
            <SettingsClient />
        </ClientOnly>
    );
}

export default SettingsPage;
