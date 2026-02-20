import { redirect } from "next/navigation";
import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getContacts from "@/app/actions/getContacts";
import ContactsClient from "./ContactsClient";

interface ContactsPageProps {
    searchParams: Promise<{
        code?: string;
    }>;
}

const ContactsPage = async (props: ContactsPageProps) => {
    const searchParams = await props.searchParams;
    const { code } = searchParams;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect('/');
    }

    const contacts = await getContacts();

    return (
        <ClientOnly>
            <ContactsClient
                contacts={contacts}
                currentUser={currentUser}
                addContactCode={code}
            />
        </ClientOnly>
    );
}

export default ContactsPage;
