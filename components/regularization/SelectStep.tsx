'use client';

import { Loader2, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';

interface LeaseOption {
    id: string;
    propertyId: string;
    tenantName: string;
    unitName: string;
    propertyAddress: string;
    startDate: Date;
}

interface SelectStepProps {
    leases: LeaseOption[];
    availableYears: number[];
    selectedLeaseId: string;
    selectedYear: number;
    isLoading: boolean;
    onSelectLease: (id: string) => void;
    onSelectYear: (year: number) => void;
    onCalculate: () => void;
    onBack: () => void;
}

const SelectStep: React.FC<SelectStepProps> = ({
    leases,
    availableYears,
    selectedLeaseId,
    selectedYear,
    isLoading,
    onSelectLease,
    onSelectYear,
    onCalculate,
    onBack,
}) => {
    const t = useTranslations('regularization');
    const locale = useLocale();
    const dateLocale = locale === 'fr' ? fr : enUS;

    // Get selected lease
    const selectedLease = leases.find(l => l.id === selectedLeaseId);

    // Get initials for avatar
    const getInitials = (name: string) => {
        const parts = name.split(' ').filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return (parts[0]?.[0] || '?').toUpperCase();
    };

    if (leases.length === 0 && !isLoading) {
        return (
            <div className="flex flex-col h-full px-6 py-8">
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                    <AlertCircle size={32} className="text-neutral-400" />
                    <p className="text-base text-neutral-500 dark:text-neutral-400">
                        {t('select.noLeases')}
                    </p>
                </div>
                <button
                    onClick={onBack}
                    className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition cursor-pointer mt-4"
                >
                    {t('guide.back')}
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full px-6 py-6">
            <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
                {/* Lease selection */}
                <div>
                    <h2 className="text-[22px] font-semibold text-neutral-900 dark:text-white mb-1">
                        {t('select.leaseTitle')}
                    </h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                        {t('select.leaseSubtitle')}
                    </p>

                    <div className="flex flex-col gap-2">
                        {leases.map((lease) => {
                            const isSelected = lease.id === selectedLeaseId;
                            return (
                                <button
                                    key={lease.id}
                                    onClick={() => onSelectLease(lease.id)}
                                    className={`
                                        w-full flex items-center gap-3 p-4 rounded-xl transition cursor-pointer text-left
                                        border
                                        ${isSelected
                                            ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800'
                                            : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                                        }
                                    `}
                                >
                                    {/* Avatar initials */}
                                    <div className={`
                                        w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-medium
                                        ${isSelected
                                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                                            : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                                        }
                                    `}>
                                        {getInitials(lease.tenantName)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                                            {lease.tenantName}
                                        </p>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                                            {lease.unitName}
                                        </p>
                                        <p className="text-sm text-neutral-400 dark:text-neutral-500">
                                            {t('select.since')} {format(new Date(lease.startDate), 'MMM yyyy', { locale: dateLocale })}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Year selection */}
                <div>
                    <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                        {t('select.yearTitle')}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {availableYears.map((year) => {
                            const isSelected = year === selectedYear;
                            return (
                                <button
                                    key={year}
                                    onClick={() => onSelectYear(year)}
                                    className={`
                                        px-4 py-2 rounded-full text-sm font-medium transition cursor-pointer
                                        ${isSelected
                                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                                            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                        }
                                    `}
                                >
                                    {year}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Monthly provision info */}
                {selectedLease && (
                    <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {t('select.provisionInfo')}
                        </p>
                    </div>
                )}
            </div>

            {/* Bottom actions */}
            <div className="flex items-center justify-between mt-6 pt-4">
                <button
                    onClick={onBack}
                    className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition cursor-pointer"
                >
                    {t('guide.back')}
                </button>

                <button
                    onClick={onCalculate}
                    disabled={isLoading || !selectedLeaseId}
                    className="
                        bg-neutral-900 dark:bg-white
                        text-white dark:text-neutral-900
                        text-base font-medium
                        rounded-xl py-3 px-6
                        hover:opacity-90 transition
                        cursor-pointer
                        disabled:opacity-50 disabled:cursor-not-allowed
                        flex items-center gap-2
                    "
                >
                    {isLoading && <Loader2 size={16} className="animate-spin" />}
                    {t('select.calculate')}
                </button>
            </div>
        </div>
    );
};

export default SelectStep;
