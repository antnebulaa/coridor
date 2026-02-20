import { redirect } from "next/navigation";
import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import TaxSimulatorClient from "./TaxSimulatorClient";

const TaxSimulatorPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect('/');
    }

    return (
        <ClientOnly>
            <TaxSimulatorClient currentUser={currentUser} />
        </ClientOnly>
    );
}

export default TaxSimulatorPage;
