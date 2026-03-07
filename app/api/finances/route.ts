import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getFinancialOverview, { getAnnualFinancialData } from "@/app/actions/getFinancialOverview";

export async function GET(request: Request) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
        const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
        const isAnnual = searchParams.get("annual") === "true";

        if (isAnnual) {
            const annualData = await getAnnualFinancialData(year);
            return NextResponse.json({ annual: annualData });
        }

        const data = await getFinancialOverview({ month, year });
        if (!data) {
            return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("[GET /api/finances] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
