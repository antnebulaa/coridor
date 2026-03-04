import { redirect } from "next/navigation";
import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import PseudonymClient from "./PseudonymClient";

const PseudonymPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect('/');
    }

    return (
        <ClientOnly>
            <PseudonymClient currentUser={currentUser} />
        </ClientOnly>
    );
}

export default PseudonymPage;
