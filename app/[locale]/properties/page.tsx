import { redirect } from "next/navigation";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getProperties from "@/app/actions/getProperties";

import PropertiesClient from "./PropertiesClient";

export const dynamic = 'force-dynamic';

const PropertiesPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect('/');
    }

    const properties = await getProperties();

    return (
        <div className="bg-neutral-100 min-h-screen">
            <PropertiesClient
                properties={properties}
                currentUser={currentUser}
            />
        </div>
    );
};

export default PropertiesPage;
