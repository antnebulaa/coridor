'use client';

import { ShieldCheck } from "lucide-react";

interface PaymentBadgeProps {
    verifiedMonths: number;
    punctualityRate?: number | null;
    compact?: boolean;
}

const PaymentBadge: React.FC<PaymentBadgeProps> = ({
    verifiedMonths,
    punctualityRate,
    compact = false
}) => {
    // Not yet verified — need at least 3 months
    if (verifiedMonths < 3) return null;

    // Gauge fills proportionally, max visual at 24+ months
    const gaugePercent = Math.min((verifiedMonths / 24) * 100, 100);

    if (compact) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-emerald-50 border-emerald-200 text-emerald-700">
                <ShieldCheck size={12} />
                <span>{'\u2713'} V{'\u00e9'}rifi{'\u00e9'} {'\u00b7'} {verifiedMonths} mois</span>
            </span>
        );
    }

    return (
        <div className="flex flex-col gap-3 p-4 rounded-xl border bg-emerald-50 border-emerald-200">
            {/* Header row */}
            <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-emerald-800">
                        Payeur v{'\u00e9'}rifi{'\u00e9'} {'\u2713'}
                    </div>
                    <div className="text-xs text-emerald-700">
                        {verifiedMonths} mois v{'\u00e9'}rifi{'\u00e9'}s
                        {punctualityRate != null && ` \u00b7 ${Math.round(punctualityRate)}% r\u00e9gulier`}
                    </div>
                </div>
            </div>

            {/* Progress gauge */}
            <div className="flex flex-col gap-1">
                <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${gaugePercent}%` }}
                    />
                </div>
                <div className="flex items-center justify-between text-xs text-emerald-700">
                    <span>3 mois</span>
                    <span>24+ mois</span>
                </div>
            </div>
        </div>
    );
};

export default PaymentBadge;
