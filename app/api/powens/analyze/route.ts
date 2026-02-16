import { NextResponse } from "next/server";
import { getPowensToken, getPowensTransactions } from "@/app/lib/powens";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { PaymentVerificationService } from "@/services/PaymentVerificationService";

export async function POST(request: Request) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code, recipientName, locale = 'fr' } = body;

    if (!code) {
        return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    try {
        // Construct redirect URI to match init (Fixed Bouncer URI)
        const host = request.headers.get('host');
        const protocol = host?.includes('localhost') ? 'http' : 'http';
        const origin = `${protocol}://${host}`; // Force Host header
        const redirectUri = `${origin}/api/powens/callback`;

        // 1. Exchange code for token
        const tokenData = await getPowensToken(code, redirectUri);

        if (!tokenData.access_token) {
            throw new Error("No access token received from Powens");
        }

        const accessToken = tokenData.access_token;
        const refreshToken = tokenData.refresh_token;
        const tokenExpiresIn = tokenData.expires_in;
        const tokenExpiresAt = new Date(Date.now() + tokenExpiresIn * 1000);

        // 2. Fetch Transactions (Transient - In Memory Only)
        // Note: In analyze/route, we might just be looking for ONE rent payment for verification,
        // BUT to be consistent with the "connect bank" feature, we should save the connection.

        const transactionsData = await getPowensTransactions(accessToken);
        const transactions = transactionsData.transactions || [];

        // 3. Privacy Filtering (Sherlock v2) 🕵️‍♂️
        let validTransactions: any[] = [];

        // Fetch TenantProfile to get landlordName
        const tenantProfile = await prisma.tenantProfile.findUnique({
            where: { userId: currentUser.id }
        });
        const landlordName = tenantProfile?.landlordName?.toLowerCase();

        console.log(`[Sherlock] Analyzing ${transactions.length} txs for landlord: ${landlordName}`);

        validTransactions = transactions.filter((tx: any) => {
            const amount = tx.value;
            if (amount >= 0) return false; // Ignore income

            const label = (tx.custom_wording || tx.wording || tx.original_wording || '').toLowerCase();

            // Rule 1: Explicit "Loyer"
            if (label.includes('loyer')) return true;

            // Rule 2: Matches Landlord Name (if provided)
            if (landlordName && label.includes(landlordName)) return true;

            return false;
        });

        // 4. Persistence

        // A. Save Connection (So we don't ask again ?)
        const connection = await prisma.bankConnection.upsert({
            where: {
                userId_connectionId: {
                    userId: currentUser.id,
                    connectionId: 'powens_connection' // We might need a real ID from Powens if multiple
                }
            },
            update: {
                accessToken,
                refreshToken,
                tokenExpiresAt,
                lastSyncedAt: new Date(),
                isActive: true
            },
            create: {
                userId: currentUser.id,
                connectionId: 'powens_connection',
                accessToken,
                refreshToken,
                tokenExpiresAt,
                lastSyncedAt: new Date(),
                provider: 'POWENS'
            }
        });

        // B. Save Filtered Transactions
        for (const tx of validTransactions) {
            await prisma.bankTransaction.upsert({
                where: {
                    bankConnectionId_remoteId: {
                        bankConnectionId: connection.id,
                        remoteId: tx.id.toString()
                    }
                },
                update: {
                    date: new Date(tx.date || tx.rdate),
                    label: tx.custom_wording || tx.wording || tx.original_wording,
                    amount: tx.value,
                    currency: tx.original_currency?.id || 'EUR',
                    category: 'Rent',
                    isProcessed: false
                },
                create: {
                    bankConnectionId: connection.id,
                    remoteId: tx.id.toString(),
                    date: new Date(tx.date || tx.rdate),
                    label: tx.custom_wording || tx.wording || tx.original_wording,
                    amount: tx.value,
                    currency: tx.original_currency?.id || 'EUR',
                    category: 'Rent'
                }
            });
        }

        // Return found verification data
        if (validTransactions.length > 0) {
            // Find most recent
            const recentTx = validTransactions.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

            // Update verification status
            await prisma.tenantProfile.update({
                where: { userId: currentUser.id },
                data: {
                    detectedRentAmount: Math.round(Math.abs(recentTx.value)),
                    rentPaymentDate: new Date(recentTx.date || recentTx.rdate).getDate(),
                    rentVerified: false
                }
            });

            // Trigger badge analysis after saving transactions
            try {
                await PaymentVerificationService.updateBadge(currentUser.id);
            } catch (badgeError) {
                console.error("[Badge] Auto-analysis failed:", badgeError);
                // Non-blocking: badge failure should not prevent the response
            }

            return NextResponse.json({
                found: true,
                amount: Math.abs(recentTx.value),
                transactions: validTransactions.slice(0, 5) // Send back a few for confirmation
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
