import { redirect } from "next/navigation";
import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import PassportClient from "./PassportClient";

const PassportPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect('/');
    }

    return (
        <ClientOnly>
            <PassportClient currentUser={currentUser} />
        </ClientOnly>
    );
}

export default PassportPage;
