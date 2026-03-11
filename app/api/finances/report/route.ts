import { NextResponse } from "next/server";
import getFinancialReport from "@/app/actions/getFinancialReport";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

        const report = await getFinancialReport(year);
        if (!report) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        return NextResponse.json(report);
    } catch (error) {
        console.error("[GET /api/finances/report] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
