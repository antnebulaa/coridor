import { redirect } from "next/navigation";
import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import FiscalClient from "./FiscalClient";

const FiscalPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect('/');
    }

    return (
        <ClientOnly>
            <FiscalClient currentUser={currentUser} />
        </ClientOnly>
    );
}

export default FiscalPage;
