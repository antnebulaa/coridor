import EmptyState from "@/components/EmptyState";
import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getDashboardStats from "@/app/actions/getDashboardStats";
import DashboardClient from "./DashboardClient";

import Link from "next/link";
import prisma from "@/libs/prismadb";
import TenantDashboardClient from "./TenantDashboardClient";

const DashboardPage = async () => {
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

    // TENANT MODE
    if (currentUser.userMode === 'TENANT') {
        const existingScope = await prisma.tenantCandidateScope.findFirst({
            where: {
                creatorUserId: currentUser.id
            }
        });

        const safeScope = existingScope ? {
            ...existingScope,
            createdAt: existingScope.createdAt.toISOString(),
            targetMoveInDate: existingScope.targetMoveInDate ? existingScope.targetMoveInDate.toISOString() : null
        } : null;

        return (
            <ClientOnly>
                <TenantDashboardClient
                    currentUser={currentUser}
                    rentalProject={safeScope}
                />
            </ClientOnly>
        )
    }

    // LANDLORD MODE
    const stats = await getDashboardStats();

    if (!stats) {
        return (
            <ClientOnly>
                <EmptyState
                    title="No data found"
                    subtitle="Start by creating a property"
                />
            </ClientOnly>
        );
    }

    return (
        <ClientOnly>
            <DashboardClient stats={stats} />
        </ClientOnly>
    );
}

export default DashboardPage;
