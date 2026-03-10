'use client';

import { useCountUp } from '@/hooks/useCountUp';

interface KPICardProps {
    cashflow: number;       // cents
    revenue: number;        // cents
    expenses: number;       // cents
    recoverableAmount: number;  // cents
    deductibleAmount: number;   // cents
}

function formatCents(cents: number): string {
    return Math.round(cents / 100).toLocaleString('fr-FR');
}

const KPICard: React.FC<KPICardProps> = ({
    cashflow, revenue, expenses, recoverableAmount, deductibleAmount,
}) => {
    const cashflowEuros = Math.abs(Math.round(cashflow / 100));
    const revenueEuros = Math.round(revenue / 100);
    const expensesEuros = Math.round(expenses / 100);

    const cashflowUp = useCountUp(cashflowEuros, 500);
    const revenueUp = useCountUp(revenueEuros, 400);
    const expensesUp = useCountUp(expensesEuros, 400);

    const isPositive = cashflow > 0;
    const isNegative = cashflow < 0;

    return (
        <div className="bg-[#18160f] dark:bg-neutral-900 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-3">
                {/* Cashflow */}
                <div className="p-4 md:p-5 border-r border-white/8">
                    <p className="text-[9px] font-semibold text-white/40 uppercase tracking-wider mb-1">
                        Cashflow Net
                    </p>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-xl md:text-2xl font-bold tabular-nums leading-none ${
                            isPositive ? 'text-emerald-400' :
                            isNegative ? 'text-red-400' :
                            'text-white/40'
                        }`}>
                            {isPositive ? '+' : isNegative ? '-' : ''}{cashflowUp.toLocaleString('fr-FR')}
                        </span>
                        <span className="text-[11px] text-white/30">€</span>
                    </div>
                </div>

                {/* Revenue */}
                <div className="p-4 md:p-5 border-r border-white/8">
                    <p className="text-[9px] font-semibold text-white/40 uppercase tracking-wider mb-1">
                        Revenus
                    </p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg md:text-xl font-bold text-white tabular-nums leading-none">
                            {revenueUp.toLocaleString('fr-FR')}
                        </span>
                        <span className="text-[11px] text-white/30">€</span>
                    </div>
                    <p className="text-[9px] text-white/35 mt-1">Loyers + charges</p>
                </div>

                {/* Expenses */}
                <div className="p-4 md:p-5">
                    <p className="text-[9px] font-semibold text-white/40 uppercase tracking-wider mb-1">
                        Dépenses
                    </p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg md:text-xl font-bold text-amber-300 tabular-nums leading-none">
                            {expensesUp.toLocaleString('fr-FR')}
                        </span>
                        <span className="text-[11px] text-white/30">€</span>
                    </div>
                    <div className="flex gap-2 mt-1">
                        {recoverableAmount > 0 && (
                            <span className="text-[8px] font-semibold text-emerald-300">
                                Récup. {formatCents(recoverableAmount)}€
                            </span>
                        )}
                        {deductibleAmount > 0 && (
                            <span className="text-[8px] font-semibold text-violet-300">
                                Déd. {formatCents(deductibleAmount)}€
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KPICard;
