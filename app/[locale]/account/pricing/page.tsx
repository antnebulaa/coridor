import PricingClient from "@/app/[locale]/pricing/PricingClient";
import getCurrentUser from "@/app/actions/getCurrentUser";

const AccountPricingPage = async () => {
    const currentUser = await getCurrentUser();

    return (
        <PricingClient currentUser={currentUser} />
    );
}

export default AccountPricingPage;
