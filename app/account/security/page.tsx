import getCurrentUser from "@/app/actions/getCurrentUser";
import SecurityClient from "./SecurityClient";

const SecurityPage = async () => {
    const currentUser = await getCurrentUser();

    return (
        <SecurityClient currentUser={currentUser} />
    );
}

export default SecurityPage;
