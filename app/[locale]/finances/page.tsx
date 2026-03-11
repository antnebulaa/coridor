import getCurrentUser from "@/app/actions/getCurrentUser";
import getFinancialReport from "@/app/actions/getFinancialReport";
import FinancesClient from "./FinancesClient";
import { redirect } from "next/navigation";

export default async function FinancesPage({
    searchParams,
}: {
    searchParams: Promise<{ year?: string }>;
}) {
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect("/");

    const params = await searchParams;
    const year = params.year ? parseInt(params.year) : new Date().getFullYear();

    const report = await getFinancialReport(year);

    return (
        <FinancesClient
            initialReport={report}
            initialYear={year}
        />
    );
}
