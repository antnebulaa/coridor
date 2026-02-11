import getCurrentUser from "@/app/actions/getCurrentUser";
import SecurityClient from "./SecurityClient";

const SecurityPage = async () => {
    const currentUser = await getCurrentUser();

    return (
        <SecurityClient />
    );
}

export default SecurityPage;
