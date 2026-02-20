import { redirect } from "next/navigation";
import getCurrentUser from "@/app/actions/getCurrentUser";
import Container from "@/components/Container";
import NotificationsClient from "./NotificationsClient";

const NotificationsPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect('/');
    }

    return (
        <Container>
            <NotificationsClient currentUser={currentUser} />
        </Container>
    );
}

export default NotificationsPage;
