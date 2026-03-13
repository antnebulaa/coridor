import { Suspense } from "react";
import { redirect } from "next/navigation";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getFinancialReport from "@/app/actions/getFinancialReport";
import FinancesClient from "./FinancesClient";
import FinancesLoading from "./loading";

// Async server component that fetches financial data
async function FinancesContent({ year }: { year: number }) {
    const report = await getFinancialReport(year);

    return (
        <FinancesClient
            initialReport={report}
            initialYear={year}
        />
    );
}

export default async function FinancesPage({
    searchParams,
}: {
    searchParams: Promise<{ year?: string }>;
}) {
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect("/");

    const params = await searchParams;
    const year = params.year ? parseInt(params.year) : new Date().getFullYear();

    return (
        <Suspense fallback={<FinancesLoading />}>
            <FinancesContent year={year} />
        </Suspense>
    );
}
