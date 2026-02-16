import getCurrentUser from "@/app/actions/getCurrentUser";
import { redirect } from "next/navigation";
import SubscriptionClient from "./SubscriptionClient";

export default async function SubscriptionPage() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        redirect('/');
    }
    return <SubscriptionClient />;
}
