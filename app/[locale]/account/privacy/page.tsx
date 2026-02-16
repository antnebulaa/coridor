import ClientOnly from "@/components/ClientOnly";
import PrivacyClient from "./PrivacyClient";
import getCurrentUser from "@/app/actions/getCurrentUser";

const PrivacyPage = async () => {
    const currentUser = await getCurrentUser();

    return (
        <ClientOnly>
            <PrivacyClient currentUser={currentUser} />
        </ClientOnly>
    );
}

export default PrivacyPage;
