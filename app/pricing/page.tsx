import PricingClient from "./PricingClient";
import getCurrentUser from "../actions/getCurrentUser";

const PricingPage = async () => {
    const currentUser = await getCurrentUser();

    return (
        <PricingClient currentUser={currentUser} />
    );
}

export default PricingPage;
