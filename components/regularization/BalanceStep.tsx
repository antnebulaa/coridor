'use client';

import { useTranslations } from 'next-intl';

interface BalanceStepProps {
    previewData: {
        balanceCents: number;
        totalRecoverableExpensesCents: number;
        totalProvisionsReceivedCents: number;
        expenses: any[];
        year: number;
    };
    tenantName: string;
    shareRatio?: number;
    onContinue: () => void;
    onBack: () => void;
}

function formatAmount(cents: number): string {
    return (cents / 100).toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }) + ' €';
}

const BalanceStep: React.FC<BalanceStepProps> = ({
    previewData,
    tenantName,
    shareRatio,
    onContinue,
    onBack,
}) => {
    const t = useTranslations('regularization');

    const balance = previewData.balanceCents;
    const realCharges = previewData.totalRecoverableExpensesCents;
    const provisions = previewData.totalProvisionsReceivedCents;
    const tenantOwes = balance > 0;
    const firstName = tenantName.split(' ')[0];

    return (
        <div className="flex flex-col h-full px-6 py-6">
            <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
                <h2 className="text-[22px] font-semibold text-neutral-900 dark:text-white">
                    {t('balance.title')}
                </h2>

                {/* Main result — dark card */}
                <div className="bg-neutral-900 dark:bg-neutral-800 rounded-2xl p-6">
                    <p className="text-sm text-neutral-400 mb-1">
                        {tenantOwes
                            ? t('balance.tenantOwes')
                            : t('balance.landlordOwes')
                        }
                    </p>
                    <p className={`text-4xl font-semibold ${tenantOwes ? 'text-white' : 'text-emerald-400'}`}>
                        {formatAmount(Math.abs(balance))}
                    </p>
                    <p className="text-sm text-neutral-400 mt-2">
                        {tenantOwes
                            ? t('balance.tenantOwesDetail', { name: firstName })
                            : t('balance.landlordOwesDetail', { name: firstName })
                        }
                    </p>
                </div>

                {/* Amounts side by side */}
                <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                {t('balance.realCharges')}
                            </p>
                            <p className="text-lg font-semibold text-neutral-900 dark:text-white mt-1">
                                {formatAmount(realCharges)}
                            </p>
                        </div>
                        <div className="w-px h-10 bg-neutral-200 dark:bg-neutral-700 mx-4" />
                        <div className="flex-1 text-right">
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                {t('balance.provisions')}
                            </p>
                            <p className="text-lg font-semibold text-neutral-900 dark:text-white mt-1">
                                {formatAmount(provisions)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Summary lines */}
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-neutral-500 dark:text-neutral-400">{t('balance.expenseCount')}</span>
                        <span className="text-neutral-900 dark:text-white font-medium">
                            {previewData.expenses?.length ?? 0}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-neutral-500 dark:text-neutral-400">{t('balance.period')}</span>
                        <span className="text-neutral-900 dark:text-white font-medium">
                            01/01/{previewData.year} — 31/12/{previewData.year}
                        </span>
                    </div>
                </div>

                {/* Colocation share info */}
                {shareRatio != null && shareRatio < 1 && (
                    <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 text-sm text-neutral-600 dark:text-neutral-400">
                        {t('balance.colocationInfo', {
                            total: formatAmount(realCharges),
                            count: Math.round(1 / shareRatio),
                            share: formatAmount(Math.round(realCharges * shareRatio)),
                            name: firstName,
                        })}
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
                    onClick={onContinue}
                    className="
                        bg-neutral-900 dark:bg-white
                        text-white dark:text-neutral-900
                        text-base font-medium
                        rounded-xl py-3 px-6
                        hover:opacity-90 transition
                        cursor-pointer
                    "
                >
                    {t('balance.reviewExpenses')}
                </button>
            </div>
        </div>
    );
};

export default BalanceStep;
