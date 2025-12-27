import { NextResponse } from "next/server";
import { getPowensToken, getPowensTransactions } from "@/app/lib/powens";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function POST(request: Request) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code, recipientName } = body;

    if (!code) {
        return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    try {
        // Construct redirect URI to match init
        const origin = request.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const redirectUri = `${origin}/account/tenant-profile`;

        // 1. Exchange code for token
        const tokenData = await getPowensToken(code, redirectUri);

        if (!tokenData.access_token) {
            throw new Error("No access token received from Powens");
        }

        const accessToken = tokenData.access_token;

        // 2. Fetch transactions
        const transactionsData = await getPowensTransactions(accessToken);
        const transactions = transactionsData.transactions || [];

        // 3. Run Sherlock Holmes Algorithm
        console.log(`[Sherlock] Analyzing ${transactions.length} transactions...`);

        if (transactions.length > 0) {
            const dates = transactions.map((t: any) => new Date(t.date || t.rdate).getTime());
            const minDate = new Date(Math.min(...dates));
            const maxDate = new Date(Math.max(...dates));
            console.log(`[Sherlock] Date range: ${minDate.toISOString()} to ${maxDate.toISOString()}`);
        }

        const analysis = analyzeTransactions(transactions, recipientName);
        console.log(`[Sherlock] Result:`, analysis);

        if (analysis.found) {
            // Update profile with detected rent (pending confirmation)
            await prisma.tenantProfile.update({
                where: { userId: currentUser.id },
                data: {
                    detectedRentAmount: Math.round(analysis.amount),
                    rentPaymentDate: analysis.date,
                    rentVerified: false
                }
            });
            return NextResponse.json({
                found: true,
                amount: analysis.amount,
                transactions: analysis.transactions
            });
        } else {
            return NextResponse.json({ found: false });
        }

    } catch (error: any) {
        console.error("Powens Analysis Error:", error?.response?.data || error);
        return NextResponse.json({
            error: "Analysis failed",
            details: error?.response?.data || error.message
        }, { status: 500 });
    }
}

// Sherlock Holmes Algorithm 🕵️‍♂️ (Adapted for Powens data structure)
function analyzeTransactions(transactions: any[], recipientName?: string) {
    const candidates: any[] = [];
    const debugLogs: string[] = [];

    transactions.forEach((tx: any) => {
        // Powens: value is negative for debit
        const amount = tx.value;
        if (amount >= 0) return; // Ignore incoming

        const absAmount = Math.abs(amount);
        if (absAmount < 200) return; // Ignore small amounts

        const date = new Date(tx.date || tx.rdate);
        const day = date.getDate();

        // Check date range (1st to 15th)
        if (day > 15) {
            debugLogs.push(`Ignored ${absAmount}€ on day ${day} (too late)`);
            return;
        }

        // Keyword Scoring
        const description = (tx.wording || tx.original_wording || "").toUpperCase();

        if (description.includes("CARREFOUR") || description.includes("AMAZON") || description.includes("PAYPAL") || description.includes("CREDIT")) return;

        let score = 0;
        if (description.includes("LOYER") || description.includes("AGENCE") || description.includes("IMMOBILIER") || description.includes("FONCIA") || description.includes("ORPI")) {
            score += 5;
        }

        // Recipient Name Boost
        if (recipientName && description.includes(recipientName.toUpperCase())) {
            score += 10;
        }

        candidates.push({ amount: absAmount, date, day, score, description });
    });

    console.log("[Sherlock] Candidates:", candidates);
    if (debugLogs.length > 0) console.log("[Sherlock] Ignored:", debugLogs.slice(0, 5));

    // Group by amount similarity (+/- 10%)
    const groups: Record<string, any[]> = {};

    candidates.forEach((c: any) => {
        let added = false;
        for (const key in groups) {
            const groupAmount = parseFloat(key);
            if (Math.abs(c.amount - groupAmount) / groupAmount < 0.10) {
                groups[key].push(c);
                added = true;
                break;
            }
        }
        if (!added) {
            groups[c.amount.toString()] = [c];
        }
    });

    // Find the best group
    let bestGroup: any = null;
    let maxScore = -1;

    for (const key in groups) {
        const group = groups[key];
        // Sort by date
        group.sort((a, b) => b.date.getTime() - a.date.getTime());

        // Check recurrence (at least 3 months)
        const uniqueMonths = new Set(group.map((c: any) => `${c.date.getFullYear()}-${c.date.getMonth()}`));

        if (uniqueMonths.size >= 3) {
            const totalScore = group.reduce((sum, c) => sum + c.score, 0);

            // Bonus for consistency (number of months)
            const consistencyScore = uniqueMonths.size * 2;

            const finalScore = totalScore + consistencyScore;

            if (finalScore > maxScore) {
                maxScore = finalScore;
                bestGroup = group;
            }
        }
    }

    if (bestGroup) {
        const avgAmount = bestGroup.reduce((sum: number, c: any) => sum + c.amount, 0) / bestGroup.length;

        // Most frequent day
        const dayCounts: Record<number, number> = {};
        bestGroup.forEach((c: any) => dayCounts[c.day] = (dayCounts[c.day] || 0) + 1);
        const bestDay = Object.keys(dayCounts).reduce((a, b) => dayCounts[parseInt(a)] > dayCounts[parseInt(b)] ? a : b);

        return {
            found: true,
            amount: Math.round(avgAmount),
            date: parseInt(bestDay),
            transactions: bestGroup.map((t: any) => ({
                date: t.date,
                amount: t.amount,
                description: t.description
            }))
        };
    }

    return { found: false, amount: 0, date: 0 };
}
