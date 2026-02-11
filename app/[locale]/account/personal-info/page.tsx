import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import PersonalInfoClient from "./PersonalInfoClient";

const PersonalInfoPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return (
            <ClientOnly>
                <EmptyState
                    title="Unauthorized"
                    subtitle="Please login"
                />
            </ClientOnly>
        )
    }

    return (
        <ClientOnly>
            <PersonalInfoClient currentUser={currentUser} />
        </ClientOnly>
    );
}

export default PersonalInfoPage;
