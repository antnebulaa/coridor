'use client';

import { ExpenseItem } from '@/app/actions/getFinancialOverview';
import { Plus } from 'lucide-react';
import { useState } from 'react';

interface ExpensesTabProps {
    data: ExpenseItem[];
    properties: { id: string; title: string }[];
    onAddExpense: () => void;
}

function formatCents(cents: number): string {
    return Math.round(cents / 100).toLocaleString('fr-FR');
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

const CATEGORY_LABELS: Record<string, string> = {
    COLD_WATER: 'Eau froide',
    HOT_WATER: 'Eau chaude',
    ELECTRICITY_COMMON: 'Électricité (commun)',
    ELECTRICITY_PRIVATE: 'Électricité (privé)',
    HEATING_COLLECTIVE: 'Chauffage collectif',
    TAX_PROPERTY: 'Taxe foncière',
    ELEVATOR: 'Ascenseur',
    INSURANCE: 'Assurance',
    MAINTENANCE: 'Entretien / Réparations',
    CARETAKER: 'Gardiennage',
    OTHER: 'Autre',
    METERS: 'Compteurs',
    GENERAL_CHARGES: 'Charges générales',
    BUILDING_CHARGES: 'Charges copropriété',
    PARKING: 'Parking',
    INSURANCE_GLI: 'Assurance GLI',
};

const ExpensesTab: React.FC<ExpensesTabProps> = ({ data, properties, onAddExpense }) => {
    const [filterProperty, setFilterProperty] = useState<string>('all');

    const filtered = filterProperty === 'all'
        ? data
        : data.filter(e => e.propertyId === filterProperty);

    const totalAmount = filtered.reduce((s, e) => s + e.amount, 0);
    const totalRecoverable = filtered
        .filter(e => e.isRecoverable)
        .reduce((s, e) => s + Math.round(e.amount * e.recoverableRatio), 0);
    const totalDeductible = filtered
        .filter(e => e.isDeductible)
        .reduce((s, e) => s + e.amount, 0);

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <button
                    onClick={onAddExpense}
                    className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition"
                >
                    <Plus size={16} />
                    Ajouter une dépense
                </button>

                {properties.length > 1 && (
                    <select
                        value={filterProperty}
                        onChange={e => setFilterProperty(e.target.value)}
                        className="text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    >
                        <option value="all">Tous les biens</option>
                        {properties.map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Expense list */}
            {filtered.length === 0 ? (
                <div className="text-center py-12 text-neutral-400 dark:text-neutral-500">
                    Aucune dépense ce mois
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(expense => (
                        <div
                            key={expense.id}
                            className="flex items-start justify-between gap-4 py-3 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 hover:border-neutral-300 dark:hover:border-neutral-600 transition"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-neutral-400 dark:text-neutral-500">
                                        {formatDate(expense.date)}
                                    </span>
                                    <span className="text-xs text-neutral-400">·</span>
                                    <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                        {expense.propertyTitle}
                                    </span>
                                </div>
                                <p className="text-sm font-medium text-neutral-900 dark:text-white mt-0.5">
                                    {CATEGORY_LABELS[expense.category] || expense.category}
                                    {expense.description && (
                                        <span className="text-neutral-500 dark:text-neutral-400 font-normal"> · {expense.description}</span>
                                    )}
                                </p>
                                <div className="flex gap-2 mt-1">
                                    {expense.isRecoverable && (
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                            Récupérable {Math.round(expense.recoverableRatio * 100)}%
                                        </span>
                                    )}
                                    {expense.isDeductible && (
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                                            Déductible
                                        </span>
                                    )}
                                </div>
                            </div>
                            <span className="text-sm font-semibold text-neutral-900 dark:text-white tabular-nums whitespace-nowrap">
                                -{formatCents(expense.amount)} €
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Totals */}
            {filtered.length > 0 && (
                <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 space-y-1">
                    <div className="flex justify-between text-sm">
                        <span className="text-neutral-600 dark:text-neutral-400">Total dépenses</span>
                        <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">{formatCents(totalAmount)} €</span>
                    </div>
                    {totalRecoverable > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-neutral-500 dark:text-neutral-400">Dont récupérable</span>
                            <span className="text-blue-600 dark:text-blue-400 tabular-nums">{formatCents(totalRecoverable)} €</span>
                        </div>
                    )}
                    {totalDeductible > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-neutral-500 dark:text-neutral-400">Dont déductible</span>
                            <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCents(totalDeductible)} €</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ExpensesTab;
