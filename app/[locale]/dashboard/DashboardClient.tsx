'use client';

import Container from "@/components/Container";
import { SafeUser } from "@/types";
import { OperationalStats } from "@/app/actions/getOperationalStats";
import { AnalyticData } from "@/app/actions/analytics";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ActionCards from "@/components/dashboard/ActionCards";
import MonthlyKPIs from "@/components/dashboard/MonthlyKPIs";
import PropertyStatusList from "@/components/dashboard/PropertyStatusList";
import FinanceSection from "@/components/dashboard/FinanceSection";
import LegalRemindersWidget from "@/components/dashboard/LegalRemindersWidget";
import RentCollectionWidget from "@/components/dashboard/RentCollectionWidget";
import FiscalWidget from "@/components/dashboard/FiscalWidget";
import DepositAlertWidget from "@/components/deposit/DepositAlertWidget";

interface DashboardClientProps {
    currentUser: SafeUser;
    financials: AnalyticData | null;
    operationalStats: OperationalStats | null;
}

const DashboardClient: React.FC<DashboardClientProps> = ({
    currentUser,
    financials,
    operationalStats,
}) => {
    const stats = operationalStats || {
        occupancyRate: 0,
        totalUnits: 0,
        occupiedUnits: 0,
        pendingApplications: 0,
        upcomingVisits: 0,
        unpaidRents: 0,
        monthlyKPIs: {
            expectedRent: 0,
            receivedRent: 0,
            rentProgress: 0,
            paidCount: 0,
            totalCount: 0,
            monthlyExpenses: 0,
            monthlyCashflow: 0,
        },
        propertyStatuses: [],
        actionItems: [],
    };

    return (
        <Container>
            <div className="pb-20 space-y-6 md:space-y-8 max-w-5xl mx-auto">
                {/* 1. Header */}
                <DashboardHeader
                    currentUser={currentUser}
                    actionItems={stats.actionItems}
                    totalUnits={stats.totalUnits}
                    occupiedUnits={stats.occupiedUnits}
                />

                {/* 2. Action Cards (conditional) */}
                <ActionCards actionItems={stats.actionItems} />

                {/* 3. Monthly KPIs */}
                <MonthlyKPIs data={stats.monthlyKPIs} />

                {/* 4. Property Status List */}
                <PropertyStatusList properties={stats.propertyStatuses} />

                {/* 5. Existing widgets (SWR-based, self-contained) */}
                <DepositAlertWidget />
                <LegalRemindersWidget />
                <RentCollectionWidget />
                <FiscalWidget />

                {/* 6. Finance Section (collapsible, contains existing KPIs + chart) */}
                <FinanceSection
                    financials={financials}
                    operationalStats={stats}
                />
            </div>
        </Container>
    );
}

export default DashboardClient;
