import ClientOnly from "@/components/ClientOnly";
import SettingsClient from "@/components/account/SettingsClient";

const SettingsPage = () => {
    return (
        <ClientOnly>
            <SettingsClient />
        </ClientOnly>
    );
}

export default SettingsPage;
