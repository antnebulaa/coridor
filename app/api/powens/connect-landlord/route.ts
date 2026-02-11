import { NextResponse } from "next/server";
import { getPowensToken } from "@/app/lib/powens";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function POST(request: Request) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code, connectionId, locale = 'fr' } = body;

    if (!code) {
        return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    try {
        const host = request.headers.get('host');
        const protocol = host?.includes('localhost') ? 'http' : 'http';
        const origin = `${protocol}://${host}`; // Force Host header
        // Fixed URI via Bouncer
        const redirectUri = `${origin}/api/powens/callback`;

        // 1. Exchange code for token
        const tokenData = await getPowensToken(code, redirectUri);

        if (!tokenData.access_token) {
            throw new Error("No access token received");
        }

        const accessToken = tokenData.access_token;
        const refreshToken = tokenData.refresh_token;
        const tokenExpiresIn = tokenData.expires_in;
        const tokenExpiresAt = new Date(Date.now() + tokenExpiresIn * 1000);

        // 2. Fetch Transactions (Transient - In Memory Only)
        // We need to fetch right away to filter and save the initial batch
        const { getPowensTransactions } = await import("@/app/lib/powens"); // Dynamic import to avoid circ dep if any
        const transactionsData = await getPowensTransactions(accessToken);
        const transactions = transactionsData.transactions || [];

        // 3. Privacy Filtering (Landlord Version) 🕵️‍♂️
        console.log(`[Sherlock Landlord] Analyzing ${transactions.length} transactions...`);

        const validTransactions = transactions.filter((tx: any) => {
            const amount = tx.value;
            if (amount <= 0) return false; // Landlords want INCOME (Credits)

            const label = (tx.custom_wording || tx.wording || tx.original_wording || '').toLowerCase();

            // Rule: Explicit "Loyer"
            // We only save incoming rent payments.
            if (label.includes('loyer')) return true;

            return false;
        });

        console.log(`[Sherlock Landlord] Found ${validTransactions.length} valid rent receipts.`);

        // 4. Persistence

        // A. Save Connection
        const connection = await prisma.bankConnection.upsert({
            where: {
                userId_connectionId: {
                    userId: currentUser.id,
                    connectionId: connectionId ? String(connectionId) : 'powens_landlord'
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
                connectionId: connectionId ? String(connectionId) : 'powens_landlord',
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
                    category: 'Rent Income',
                    isProcessed: false
                },
                create: {
                    bankConnectionId: connection.id,
                    remoteId: tx.id.toString(),
                    date: new Date(tx.date || tx.rdate),
                    label: tx.custom_wording || tx.wording || tx.original_wording,
                    amount: tx.value,
                    currency: tx.original_currency?.id || 'EUR',
                    category: 'Rent Income'
                }
            });
        }

        return NextResponse.json({
            connection,
            transactionsSaved: validTransactions.length
        });

    } catch (error: any) {
        console.error("Powens Connect Error:", error);
        return NextResponse.json({ error: "Connection failed" }, { status: 500 });
    }
}
