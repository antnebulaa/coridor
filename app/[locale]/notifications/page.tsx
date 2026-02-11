
import getCurrentUser from "@/app/actions/getCurrentUser";
import Container from "@/components/Container";
import NotificationsClient from "./NotificationsClient";

const NotificationsPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return (
            <Container>
                <div className="flex flex-col items-center justify-center h-[50vh]">
                    <div className="text-xl font-bold">Accès non autorisé</div>
                </div>
            </Container>
        );
    }

    return (
        <Container>
            <NotificationsClient currentUser={currentUser} />
        </Container>
    );
}

export default NotificationsPage;
