'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface SendStepProps {
    tenantName: string;
    propertyAddress: string;
    year: number;
    totalChargesCents: number;
    totalProvisionsCents: number;
    balanceCents: number;
    isSending: boolean;
    onSend: () => void;
    onBack: () => void;
}

function formatAmount(cents: number): string {
    return (cents / 100).toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }) + ' €';
}

const SendStep: React.FC<SendStepProps> = ({
    tenantName,
    propertyAddress,
    year,
    totalChargesCents,
    totalProvisionsCents,
    balanceCents,
    isSending,
    onSend,
    onBack,
}) => {
    const t = useTranslations('regularization');
    const firstName = tenantName.split(' ')[0];

    return (
        <div className="flex flex-col h-full px-6 py-6">
            <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
                <h2 className="text-[22px] font-semibold text-neutral-900 dark:text-white">
                    {t('send.title')}
                </h2>

                {/* Recap card */}
                <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-neutral-500 dark:text-neutral-400">{t('send.tenant')}</span>
                            <span className="text-neutral-900 dark:text-white font-medium">{tenantName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-neutral-500 dark:text-neutral-400">{t('send.property')}</span>
                            <span className="text-neutral-900 dark:text-white font-medium truncate ml-4 text-right max-w-[60%]">
                                {propertyAddress}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-neutral-500 dark:text-neutral-400">{t('send.year')}</span>
                            <span className="text-neutral-900 dark:text-white font-medium">{year}</span>
                        </div>

                        <hr className="border-neutral-200 dark:border-neutral-700" />

                        <div className="flex justify-between text-sm">
                            <span className="text-neutral-500 dark:text-neutral-400">{t('balance.realCharges')}</span>
                            <span className="text-neutral-900 dark:text-white font-medium">
                                {formatAmount(totalChargesCents)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-neutral-500 dark:text-neutral-400">{t('balance.provisions')}</span>
                            <span className="text-neutral-900 dark:text-white font-medium">
                                {formatAmount(totalProvisionsCents)}
                            </span>
                        </div>

                        <hr className="border-neutral-200 dark:border-neutral-700" />

                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-neutral-900 dark:text-white">{t('send.balance')}</span>
                            <span className={`font-semibold text-base ${balanceCents > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                {balanceCents > 0 ? '+' : ''}{formatAmount(balanceCents)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Warning */}
                <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4">
                    <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                        {t('send.warning', { name: firstName })}
                    </p>
                </div>
            </div>

            {/* Bottom actions */}
            <div className="flex items-center justify-between mt-6 pt-4">
                <button
                    onClick={onBack}
                    disabled={isSending}
                    className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition cursor-pointer disabled:opacity-50"
                >
                    {t('guide.back')}
                </button>

                <button
                    onClick={onSend}
                    disabled={isSending}
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
                    {isSending && <Loader2 size={16} className="animate-spin" />}
                    {t('send.sendButton', { name: firstName })}
                </button>
            </div>
        </div>
    );
};

export default SendStep;
