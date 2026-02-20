import { redirect } from "next/navigation";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getActiveRental from "@/app/actions/getActiveRental";
import ClientOnly from "@/components/ClientOnly";
import MyRentalClient from "./MyRentalClient";

export const dynamic = 'force-dynamic';

const MyRentalPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect('/');
    }

    const rental = await getActiveRental();

    return (
        <ClientOnly>
            <MyRentalClient currentUser={currentUser} rental={rental} />
        </ClientOnly>
    );
}

export default MyRentalPage;
