import getCurrentUser from "@/app/actions/getCurrentUser";
import getFinancialOverview from "@/app/actions/getFinancialOverview";
import FinancesClient from "./FinancesClient";
import { redirect } from "next/navigation";

export default async function FinancesPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string; month?: string; year?: string; mode?: string }>;
}) {
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect("/");

    const params = await searchParams;
    const now = new Date();
    const month = params.month ? parseInt(params.month) : now.getMonth() + 1;
    const year = params.year ? parseInt(params.year) : now.getFullYear();
    const tab = (params.tab as 'revenue' | 'rent' | 'expenses') || 'revenue';
    const mode = (params.mode as 'month' | 'year') || 'month';

    const data = await getFinancialOverview({ month, year });

    return (
        <FinancesClient
            initialData={data}
            initialMonth={month}
            initialYear={year}
            initialTab={tab}
            initialMode={mode}
        />
    );
}
