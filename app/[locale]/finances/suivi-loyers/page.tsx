import getCurrentUser from "@/app/actions/getCurrentUser";
import getRentTracking from "@/app/actions/getRentTracking";
import { redirect } from "next/navigation";
import RentTrackingClient from "./RentTrackingClient";

export default async function SuiviLoyersPage({
    searchParams,
}: {
    searchParams: Promise<{ month?: string; year?: string }>;
}) {
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect("/");

    const params = await searchParams;
    const now = new Date();
    const month = params.month ? parseInt(params.month) : now.getMonth() + 1;
    const year = params.year ? parseInt(params.year) : now.getFullYear();

    const data = await getRentTracking(month, year);

    return (
        <RentTrackingClient
            initialData={data}
            initialMonth={month}
            initialYear={year}
        />
    );
}
