import getCurrentUser from "@/app/actions/getCurrentUser";
import SecurityClient from "./SecurityClient";
import { redirect } from 'next/navigation';

const SecurityPage = async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser) { redirect('/'); }

    return (
        <SecurityClient />
    );
}

export default SecurityPage;
