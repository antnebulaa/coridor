import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "@/app/actions/getCurrentUser";
import EmptyState from "@/components/EmptyState";
import prisma from "@/libs/prismadb";
import FinancesClient from "./FinancesClient";

const FinancesPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return (
            <ClientOnly>
                <EmptyState
                    title="Unauthorized"
                    subtitle="Please login"
                />
            </ClientOnly>
        );
    }

    // Fetch existing bank connections
    const connections = await prisma.bankConnection.findMany({
        where: { userId: currentUser.id },
        include: {
            transactions: {
                orderBy: { date: 'desc' },
                take: 50 // Recent transactions
            }
        }
    });

    const safeConnections = connections.map((conn) => ({
        ...conn,
        createdAt: conn.createdAt.toISOString(),
        updatedAt: conn.updatedAt.toISOString(),
        lastSyncedAt: conn.lastSyncedAt ? conn.lastSyncedAt.toISOString() : null,
        tokenExpiresAt: conn.tokenExpiresAt ? conn.tokenExpiresAt.toISOString() : null,
        transactions: conn.transactions.map((tx) => ({
            ...tx,
            date: tx.date.toISOString(),
            createdAt: tx.createdAt.toISOString()
        }))
    }));

    return (
        <ClientOnly>
            <FinancesClient
                currentUser={currentUser}
                connections={safeConnections}
            />
        </ClientOnly>
    );
};

export default FinancesPage;
