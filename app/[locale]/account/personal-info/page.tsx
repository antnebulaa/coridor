import { redirect } from "next/navigation";
import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import PersonalInfoClient from "./PersonalInfoClient";

const PersonalInfoPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect('/');
    }

    return (
        <ClientOnly>
            <PersonalInfoClient currentUser={currentUser} />
        </ClientOnly>
    );
}

export default PersonalInfoPage;
