'use client';

interface CashflowSummaryProps {
    cashflow: number; // cents
    label?: string;
}

function formatCents(cents: number): string {
    const euros = Math.round(cents / 100);
    return euros.toLocaleString('fr-FR');
}

const CashflowSummary: React.FC<CashflowSummaryProps> = ({ cashflow, label }) => {
    const isPositive = cashflow > 0;
    const isNegative = cashflow < 0;
    const sign = isPositive ? '+' : '';

    return (
        <div className="text-center py-2">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {label || 'Cashflow net ce mois'} :{' '}
            </span>
            <span className={`text-lg font-semibold tabular-nums ${
                isPositive ? 'text-emerald-600' :
                isNegative ? 'text-red-600' :
                'text-neutral-400'
            }`}>
                {sign}{formatCents(cashflow)} €
            </span>
        </div>
    );
};

export default CashflowSummary;
