'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { usePathname } from '@/i18n/navigation';
import useSWR from 'swr';
import axios from 'axios';

import { FinancialReport } from '@/lib/finances/types';
import { generateInsights } from '@/lib/finances/insightsEngine';
import FinancesHeader from '@/components/finances/FinancesHeader';
import QuickLinks from '@/components/finances/QuickLinks';
import NetResultCard from '@/components/finances/NetResultCard';
import InsightCard from '@/components/finances/InsightCard';
import DataInviteCard from '@/components/finances/DataInviteCard';
import PropertyCostSection from '@/components/finances/PropertyCostSection';
import FiscalSection from '@/components/finances/FiscalSection';
import type { CollectableField } from '@/components/finances/PropertyDataSheet';

const RegularizationModal = dynamic(
    () => import('@/app/[locale]/properties/components/RegularizationModal'),
    { ssr: false }
);

const PropertyDataSheet = dynamic(
    () => import('@/components/finances/PropertyDataSheet'),
    { ssr: false }
);

interface FinancesClientProps {
    initialReport: FinancialReport | null;
    initialYear: number;
}

const fetcher = (url: string) => axios.get(url).then(r => r.data);

const FinancesClient: React.FC<FinancesClientProps> = ({
    initialReport,
    initialYear,
}) => {
    const router = useRouter();
    const pathname = usePathname();
    const [year, setYear] = useState(initialYear);
    const [insightsExpanded, setInsightsExpanded] = useState(false);
    const [regularizationOpen, setRegularizationOpen] = useState(false);

    // Data sheet state for progressive collection
    const [sheetOpen, setSheetOpen] = useState(false);
    const [sheetField, setSheetField] = useState<CollectableField>('acquisition');
    const [sheetPropertyId, setSheetPropertyId] = useState('');
    const [sheetPropertyTitle, setSheetPropertyTitle] = useState('');
    const [sheetPropertyAddress, setSheetPropertyAddress] = useState('');

    // Fetch report when year changes (SWR for client-side navigation)
    const { data: report, mutate } = useSWR<FinancialReport>(
        `/api/finances/report?year=${year}`,
        fetcher,
        { fallbackData: initialReport || undefined, revalidateOnFocus: false }
    );

    const handleYearChange = useCallback((newYear: number) => {
        setYear(newYear);
        router.replace(`${pathname}?year=${newYear}`, { scroll: false });
    }, [router, pathname]);

    const handleExport = useCallback((format: 'pdf' | 'csv') => {
        window.open(`/api/accounting/export?format=${format}&year=${year}`, '_blank');
    }, [year]);

    // Open data collection sheet
    const openDataSheet = useCallback((
        field: CollectableField,
        propertyId: string,
        propertyTitle: string,
        propertyAddress: string
    ) => {
        setSheetField(field);
        setSheetPropertyId(propertyId);
        setSheetPropertyTitle(propertyTitle);
        setSheetPropertyAddress(propertyAddress);
        setSheetOpen(true);
    }, []);

    // After data sheet validation, revalidate the report
    const handleDataComplete = useCallback(() => {
        mutate();
    }, [mutate]);

    // Generate insights
    const insights = report ? generateInsights(report) : [];
    const visibleInsights = insightsExpanded ? insights : insights.slice(0, 4);

    // First listing for quick links
    const firstListingId = report?.properties.find(p => p.listingId)?.listingId || undefined;

    // Data invites
    const dataInvites = report?.dataInvites || [];

    // Stagger animation state
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    if (!report) {
        return (
            <div className="max-w-3xl mx-auto px-4 pb-28 pt-6">
                <p className="text-center text-neutral-400 dark:text-neutral-500 py-20">
                    Chargement...
                </p>
            </div>
        );
    }

    const sectionClass = () =>
        `transition-all duration-500 ease-out ${
            mounted
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-3'
        }`;

    return (
        <div className="max-w-3xl mx-auto px-4 pb-28 pt-6 md:pt-8">
            {/* Header */}
            <div className={sectionClass()} style={{ transitionDelay: '50ms' }}>
                <FinancesHeader
                    year={year}
                    availableYears={report.availableYears}
                    onYearChange={handleYearChange}
                    onExport={handleExport}
                />
            </div>

            {/* Quick Links */}
            <div className={`mt-5 ${sectionClass()}`} style={{ transitionDelay: '100ms' }}>
                <QuickLinks firstListingId={firstListingId} onRegularizationClick={() => setRegularizationOpen(true)} />
            </div>

            {/* Net Result Hero Card */}
            <div className={`mt-5 ${sectionClass()}`} style={{ transitionDelay: '150ms' }}>
                <NetResultCard report={report} />
            </div>

            {/* Insights + Data Invites */}
            {(insights.length > 0 || dataInvites.length > 0) && (
                <div className={`mt-8 ${sectionClass()}`} style={{ transitionDelay: '250ms' }}>
                    <p className="text-sm text-neutral-400 uppercase tracking-wider font-medium mb-4">
                        Recommandations
                    </p>
                    <div className="space-y-2.5">
                        {/* Data invite card (one at a time) */}
                        {dataInvites.map(invite => (
                            <DataInviteCard
                                key={invite.field}
                                title={invite.title}
                                description={invite.description}
                                unlocks={invite.unlocks}
                                doodleName={invite.doodleName}
                                color={invite.color}
                                propertyName={invite.propertyTitle}
                                extraCount={invite.extraCount}
                                onAction={() => openDataSheet(
                                    invite.field,
                                    invite.propertyId,
                                    invite.propertyTitle,
                                    invite.propertyAddress
                                )}
                            />
                        ))}

                        {/* Regular insights */}
                        {visibleInsights.map(insight => (
                            <InsightCard key={insight.id} insight={insight} />
                        ))}
                    </div>
                    {insights.length > 4 && (
                        <button
                            onClick={() => setInsightsExpanded(v => !v)}
                            className="mt-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                        >
                            {insightsExpanded
                                ? 'Voir moins'
                                : `Voir plus de recommandations (${insights.length - 4})`}
                        </button>
                    )}
                </div>
            )}

            {/* Property Cost Timeline */}
            {report.properties.length > 0 && (
                <div className={`mt-8 ${sectionClass()}`} style={{ transitionDelay: '350ms' }}>
                    <PropertyCostSection
                        properties={report.properties}
                        year={year}
                    />
                </div>
            )}

            {/* Fiscal Declaration */}
            <div className={`mt-8 ${sectionClass()}`} style={{ transitionDelay: '450ms' }}>
                <p className="text-sm text-neutral-400 uppercase tracking-wider font-semibold mb-2">
                    Déclaration fiscale
                </p>
                <FiscalSection
                    declaration={report.declaration2044}
                    year={year}
                    hasPowens={report.hasPowensConnection}
                    properties={report.properties.map(p => ({
                        id: p.id,
                        title: p.title,
                        address: p.address,
                    }))}
                />
            </div>

            {/* Regularization Modal — no propertyId = all owner's properties */}
            <RegularizationModal
                isOpen={regularizationOpen}
                onClose={() => setRegularizationOpen(false)}
            />

            {/* Property Data Sheet — progressive data collection */}
            <PropertyDataSheet
                isOpen={sheetOpen}
                onClose={() => setSheetOpen(false)}
                propertyId={sheetPropertyId}
                propertyTitle={sheetPropertyTitle}
                propertyAddress={sheetPropertyAddress}
                field={sheetField}
                onComplete={handleDataComplete}
            />
        </div>
    );
};

export default FinancesClient;
