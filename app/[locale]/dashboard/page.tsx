import { Suspense } from "react";
import { redirect } from "next/navigation";
import getCurrentUser from "@/app/actions/getCurrentUser";
import DashboardLoading from "./loading";

export const dynamic = 'force-dynamic';

// Async server component for Landlord dashboard — fetches data then renders client
async function LandlordDashboard({ currentUser }: { currentUser: any }) {
    const [{ getFinancialAnalytics }, { default: getOperationalStats }, { default: DashboardClient }] = await Promise.all([
        import("@/app/actions/analytics"),
        import("@/app/actions/getOperationalStats"),
        import("./DashboardClient"),
    ]);

    const currentYear = new Date().getFullYear();

    const [financialData, operationalStats] = await Promise.all([
        getFinancialAnalytics(undefined, currentYear).catch(() => null),
        getOperationalStats(),
    ]);

    return (
        <DashboardClient
            currentUser={currentUser}
            financials={financialData}
            operationalStats={operationalStats}
        />
    );
}

// Async server component for Tenant dashboard — fetches data then renders client
async function TenantDashboard({ currentUser }: { currentUser: any }) {
    const [prismaModule, { default: getApplications }, { default: getVisits }, { default: TenantDashboardClient }] = await Promise.all([
        import("@/libs/prismadb"),
        import("@/app/actions/getApplications"),
        import("@/app/actions/getVisits"),
        import("./TenantDashboardClient"),
    ]);
    const prisma = prismaModule.default;

    const [existingScope, applications, visits] = await Promise.all([
        prisma.tenantCandidateScope.findFirst({
            where: {
                OR: [
                    { creatorUserId: currentUser.id },
                    { membersIds: { has: currentUser.id } }
                ]
            }
        }),
        getApplications(),
        getVisits(),
    ]);

    const safeScope = existingScope ? {
        ...existingScope,
        createdAt: existingScope.createdAt.toISOString(),
        targetMoveInDate: existingScope.targetMoveInDate ? existingScope.targetMoveInDate.toISOString() : null
    } : null;

    return (
        <TenantDashboardClient
            currentUser={currentUser}
            rentalProject={safeScope}
            applications={applications}
            visits={visits}
        />
    );
}

const DashboardPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect('/');
    }

    if (currentUser.userMode === 'TENANT') {
        return (
            <Suspense fallback={<DashboardLoading />}>
                <TenantDashboard currentUser={currentUser} />
            </Suspense>
        );
    }

    return (
        <Suspense fallback={<DashboardLoading />}>
            <LandlordDashboard currentUser={currentUser} />
        </Suspense>
    );
}

export default DashboardPage;
