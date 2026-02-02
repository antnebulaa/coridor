import { NextResponse } from "next/server";
import { getPowensTransactions } from "@/app/lib/powens";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function POST(request: Request) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { connectionId } = body; // Local DB ID

    try {
        // 1. Fetch Connection
        const connection = await prisma.bankConnection.findUnique({
            where: { id: connectionId, userId: currentUser.id }
        });

        if (!connection || !connection.accessToken) {
            return NextResponse.json({ error: "Connection not found" }, { status: 404 });
        }

        // 2. Fetch Transactions from Powens
        // TODO: Handle Token Refresh if expired
        const data = await getPowensTransactions(connection.accessToken);
        const transactions = data.transactions || [];

        console.log(`[Sync] Fetched ${transactions.length} transactions`);

        // 3. Upsert Transactions
        let addedCount = 0;

        for (const tx of transactions) {
            // Only save credit (positive) for Rent? 
            // Or save everything for Cashflow view? User might want expenses too.
            // Let's save everything.

            // Powens Date can be `date` (accounting) or `rdate` (realality).
            const txDate = new Date(tx.date || tx.rdate);

            await prisma.bankTransaction.upsert({
                where: {
                    bankConnectionId_remoteId: {
                        bankConnectionId: connection.id,
                        remoteId: String(tx.id)
                    }
                },
                update: {
                    // Update if needed? changing label?
                },
                create: {
                    bankConnectionId: connection.id,
                    remoteId: String(tx.id),
                    date: txDate,
                    label: tx.wording || tx.original_wording || "Transaction",
                    amount: tx.value,
                    category: tx.type // or category mapping
                }
            });
            addedCount++;
        }

        // 4. Trigger Reconciliation Logic (Sherlock)
        // Iterate unprocessed positive transactions
        const unprocessed = await prisma.bankTransaction.findMany({
            where: {
                bankConnectionId: connection.id,
                isProcessed: false,
                amount: { gt: 0 } // Income only
            }
        });

        // Simple Matcher against Active Leases
        // Fetch User's Active Leases
        const leases = await prisma.rentalApplication.findMany({
            where: {
                listing: { rentalUnit: { property: { ownerId: currentUser.id } } },
                leaseStatus: 'SIGNED',
                financials: { some: {} } // Has financials
            },
            include: {
                candidateScope: {
                    include: {
                        creatorUser: true // Contains Tenant Name
                    }
                },
                financials: true
            }
        });

        const matches: any[] = [];

        for (const tx of unprocessed) {
            let matchedLeaseId = null;

            for (const lease of leases) {
                // Match Amount (Base + Charge)
                const currentFinancial = lease.financials[0]; // Simplification: Take first/current
                if (!currentFinancial) continue;

                const expectedAmount = (currentFinancial.baseRentCents + currentFinancial.serviceChargesCents) / 100;

                // Tolerance 1%
                const diff = Math.abs(tx.amount - expectedAmount);
                if (diff / expectedAmount < 0.01) {
                    // Amount Match! Now check Label/Sender
                    const tenantName = lease.candidateScope.creatorUser.name || lease.candidateScope.creatorUser.firstName || "";
                    const tenantLast = lease.candidateScope.creatorUser.lastName || "";

                    const label = tx.label.toUpperCase();

                    if (label.includes("LOYER") || (tenantLast && label.includes(tenantLast.toUpperCase()))) {
                        matchedLeaseId = lease.id;
                        matches.push({ txId: tx.id, leaseId: lease.id, amount: tx.amount, tenant: tenantName });
                        break;
                    }
                }
            }

            if (matchedLeaseId) {
                await prisma.bankTransaction.update({
                    where: { id: tx.id },
                    data: {
                        isProcessed: true,
                        matchedLeaseId: matchedLeaseId
                    }
                });
            } else {
                // Mark processed even if not found?
                // Maybe "Ignored" but we might re-process if lease added later?
                // For now, leave isProcessed=false unless explicitly ignored.
            }
        }

        return NextResponse.json({
            success: true,
            count: transactions.length,
            matches
        });

    } catch (error: any) {
        console.error("Sync Error:", error);
        return NextResponse.json({ error: "Sync failed" }, { status: 500 });
    }
}
