'use client';

import { ShieldCheck } from "lucide-react";

interface PaymentBadgeProps {
    badgeLevel: string | null;      // "BRONZE", "SILVER", "GOLD" or null
    verifiedMonths?: number;
    punctualityRate?: number | null;
    compact?: boolean;              // For inline display (just icon + label)
}

const PaymentBadge: React.FC<PaymentBadgeProps> = ({
    badgeLevel,
    verifiedMonths,
    punctualityRate,
    compact = false
}) => {
    if (!badgeLevel) return null;

    const config = {
        GOLD: {
            label: 'Payeur Or',
            emoji: '\uD83E\uDD47',
            bg: 'bg-yellow-50 border-yellow-200',
            text: 'text-yellow-800',
            iconColor: 'text-yellow-600',
        },
        SILVER: {
            label: 'Payeur Argent',
            emoji: '\uD83E\uDD48',
            bg: 'bg-gray-50 border-gray-200',
            text: 'text-gray-700',
            iconColor: 'text-gray-500',
        },
        BRONZE: {
            label: 'Payeur Bronze',
            emoji: '\uD83E\uDD49',
            bg: 'bg-orange-50 border-orange-200',
            text: 'text-orange-800',
            iconColor: 'text-orange-500',
        }
    };

    const c = config[badgeLevel as keyof typeof config];
    if (!c) return null;

    if (compact) {
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text}`}>
                <span>{c.emoji}</span>
                <span>{c.label}</span>
            </span>
        );
    }

    return (
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${c.bg}`}>
            <div className="text-2xl">{c.emoji}</div>
            <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm ${c.text}`}>{c.label}</div>
                {verifiedMonths && (
                    <div className="text-xs text-neutral-500">
                        {verifiedMonths} mois v{'\u00e9'}rifi{'\u00e9'}s
                        {punctualityRate != null && ` \u00B7 ${Math.round(punctualityRate)}% ponctuel`}
                    </div>
                )}
            </div>
            <ShieldCheck size={18} className={c.iconColor} />
        </div>
    );
};

export default PaymentBadge;
