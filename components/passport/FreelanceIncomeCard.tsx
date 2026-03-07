'use client';

import { ShieldCheck, RefreshCw, TrendingUp, Loader2 } from 'lucide-react';

interface MonthlyIncome {
    month: string;
    amount: number;
    transactionCount: number;
}

interface FreelanceIncomeData {
    freelanceSmoothedIncome: number | null;
    freelanceAnnualIncome: number | null;
    freelanceIncomeConfidence: string | null;
    freelanceIncomeVerifiedAt: string | null;
    freelanceIncomeMonths: number | null;
    freelanceIncomeBreakdown: MonthlyIncome[] | null;
}

interface FreelanceIncomeCardProps {
    data: FreelanceIncomeData;
    onRefresh: () => void;
    loading: boolean;
}

const MONTH_LABELS: Record<string, string> = {
    '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr',
    '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Aoû',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc',
};

function formatMonth(monthKey: string): string {
    const [year, month] = monthKey.split('-');
    return `${MONTH_LABELS[month] || month} ${year}`;
}

export default function FreelanceIncomeCard({ data, onRefresh, loading }: FreelanceIncomeCardProps) {
    const {
        freelanceSmoothedIncome,
        freelanceAnnualIncome,
        freelanceIncomeConfidence,
        freelanceIncomeVerifiedAt,
        freelanceIncomeMonths,
        freelanceIncomeBreakdown,
    } = data;

    if (!freelanceSmoothedIncome) return null;

    const breakdown = (freelanceIncomeBreakdown || []) as MonthlyIncome[];
    const maxAmount = Math.max(...breakdown.map(m => m.amount), 1);

    const confidenceLabel = freelanceIncomeConfidence === 'HIGH'
        ? 'Confiance élevée'
        : freelanceIncomeConfidence === 'MEDIUM'
            ? 'Confiance moyenne'
            : 'Auto-détecté — vérification en cours';

    const confidenceStyle = freelanceIncomeConfidence === 'HIGH'
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        : freelanceIncomeConfidence === 'MEDIUM'
            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400';

    const verifiedDate = freelanceIncomeVerifiedAt
        ? new Date(freelanceIncomeVerifiedAt).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        })
        : null;

    return (
        <div className="flex flex-col gap-5 p-6 border border-border rounded-xl bg-card">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <TrendingUp size={20} className="text-emerald-600" />
                        Revenus lissés
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit ${confidenceStyle}`}>
                        <ShieldCheck size={12} />
                        {confidenceLabel}
                    </span>
                </div>
            </div>

            {/* Main amount */}
            <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">
                        {freelanceSmoothedIncome.toLocaleString('fr-FR')} €
                    </span>
                    <span className="text-muted-foreground text-sm">/ mois</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck size={14} />
                    Vérifié via connexion bancaire
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Basé sur {freelanceIncomeMonths || 0} mois de transactions vérifiées
                    {freelanceAnnualIncome ? ` · ${freelanceAnnualIncome.toLocaleString('fr-FR')} € sur 12 mois` : ''}
                </p>
            </div>

            {/* Monthly bars */}
            {breakdown.length > 0 && (
                <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Détail mensuel
                    </span>
                    {breakdown.map((m) => (
                        <div key={m.month} className="flex items-center gap-3 text-sm">
                            <span className="w-16 text-xs text-muted-foreground shrink-0">
                                {formatMonth(m.month)}
                            </span>
                            <div className="flex-1 h-4 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                {m.amount > 0 && (
                                    <div
                                        className="h-full bg-emerald-500 dark:bg-emerald-600 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.max((m.amount / maxAmount) * 100, 2)}%` }}
                                    />
                                )}
                            </div>
                            <span className={`w-20 text-right text-xs tabular-nums ${m.amount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                {m.amount > 0 ? `${m.amount.toLocaleString('fr-FR')} €` : '0 €'}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
                {verifiedDate && (
                    <span className="text-xs text-muted-foreground">
                        Dernière vérification : {verifiedDate}
                    </span>
                )}
                <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                    {loading ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : (
                        <RefreshCw size={14} />
                    )}
                    Actualiser
                </button>
            </div>
        </div>
    );
}
