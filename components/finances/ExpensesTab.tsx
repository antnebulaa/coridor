'use client';

import { ExpenseItem, CategoryBreakdown, UpcomingExpense, CATEGORY_META } from '@/app/actions/getFinancialOverview';
import { Link } from '@/i18n/navigation';
import { Plus, Receipt, ChevronDown, Trash2, Pencil } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import CustomToast from '@/components/ui/CustomToast';

interface ExpensesTabProps {
    data: ExpenseItem[];
    properties: { id: string; title: string; listingId?: string }[];
    onAddExpense: (listingId?: string) => void;
    year: number;
    categoryBreakdown?: CategoryBreakdown[];
    upcomingExpenses?: UpcomingExpense[];
    onMutate?: () => void;
}

function formatCents(cents: number): string {
    return Math.round(cents / 100).toLocaleString('fr-FR');
}

function formatCentsDecimal(cents: number): string {
    return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

const FREQUENCY_LABELS: Record<string, string> = {
    ONCE: 'Ponctuel',
    MONTHLY: 'Mensuel',
    QUARTERLY: 'Trimestriel',
    YEARLY: 'Annuel',
};

const MONTH_PILLS = ['Tous', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

// ─── Upcoming Widget ─────────────────────────────────────────

const UpcomingWidget: React.FC<{ items: UpcomingExpense[] }> = ({ items }) => {
    const [expanded, setExpanded] = useState(false);
    if (items.length === 0) return null;

    const totalAmount = items.reduce((s, e) => s + e.amount, 0);
    const visible = expanded ? items : items.slice(0, 3);

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-3.5 mb-3">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-900 dark:text-white">À venir</span>
                    <span className="text-[10px] font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full px-2 py-0.5">
                        ~{formatCents(totalAmount)} €
                    </span>
                </div>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500">12 prochains mois</span>
            </div>
            {visible.map((item, i) => (
                <div
                    key={i}
                    className={`flex items-center gap-2.5 py-2 ${i > 0 ? 'border-t border-neutral-100 dark:border-neutral-800' : ''}`}
                >
                    <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xs shrink-0">
                        {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-neutral-900 dark:text-white">{item.label}</p>
                        <p className="text-[9px] text-neutral-400 dark:text-neutral-500">{FREQUENCY_LABELS[item.frequency] || item.frequency}</p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-xs font-semibold text-neutral-900 dark:text-white tabular-nums">{formatCents(item.amount)} €</p>
                        <p className="text-[9px] text-neutral-400 dark:text-neutral-500">{formatDate(item.date)}</p>
                    </div>
                </div>
            ))}
            {items.length > 3 && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full flex items-center justify-center gap-1 pt-2 text-[11px] text-neutral-500 dark:text-neutral-400 font-medium hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                >
                    {expanded ? 'Voir moins' : `Voir tout (${items.length})`}
                    <ChevronDown size={10} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                </button>
            )}
        </div>
    );
};

// ─── Breakdown Widget ────────────────────────────────────────

const BreakdownWidget: React.FC<{ items: CategoryBreakdown[]; year: number }> = ({ items, year }) => {
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);
    if (items.length === 0) return null;

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-3.5 mb-3">
            <p className="text-xs font-semibold text-neutral-900 dark:text-white mb-2">Répartition {year}</p>
            {/* Color bar */}
            <div className="flex rounded overflow-hidden h-1.5 mb-2">
                {items.map((c, i) => (
                    <div
                        key={i}
                        style={{ width: `${c.percentage}%`, backgroundColor: c.color }}
                        className={`transition-opacity duration-150 cursor-pointer ${
                            hoverIdx !== null && hoverIdx !== i ? 'opacity-20' : 'opacity-100'
                        }`}
                        onMouseEnter={() => setHoverIdx(i)}
                        onMouseLeave={() => setHoverIdx(null)}
                    />
                ))}
            </div>
            {/* Legend */}
            {items.map((c, i) => (
                <div
                    key={i}
                    className={`flex items-center gap-1.5 text-[10px] py-0.5 cursor-default transition-opacity duration-150 ${
                        hoverIdx !== null && hoverIdx !== i ? 'opacity-30' : 'opacity-100'
                    }`}
                    onMouseEnter={() => setHoverIdx(i)}
                    onMouseLeave={() => setHoverIdx(null)}
                >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="text-neutral-600 dark:text-neutral-400 flex-1">{c.label}</span>
                    <span className="text-neutral-400 dark:text-neutral-500 tabular-nums">{c.percentage}%</span>
                    <span className="text-neutral-900 dark:text-white font-semibold tabular-nums min-w-12 text-right">
                        {formatCents(c.amount)}€
                    </span>
                </div>
            ))}
        </div>
    );
};

// ─── Expense Row (swipe mobile + hover desktop) ─────────────

const ExpenseRow: React.FC<{
    expense: ExpenseItem;
    listingId?: string;
    onDelete: (id: string) => void;
    isDeleting?: boolean;
}> = ({ expense, listingId, onDelete, isDeleting }) => {
    const [swipeX, setSwipeX] = useState(0);
    const [swiping, setSwiping] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const startX = useRef(0);

    const meta = CATEGORY_META[expense.category] || CATEGORY_META.OTHER;

    const handleTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        setSwiping(true);
    };
    const handleTouchMove = (e: React.TouchEvent) => {
        if (!swiping) return;
        const dx = e.touches[0].clientX - startX.current;
        setSwipeX(Math.max(Math.min(dx, 0), -80));
    };
    const handleTouchEnd = () => {
        setSwiping(false);
        if (swipeX < -40) setSwipeX(-76);
        else setSwipeX(0);
    };

    return (
        <div className={`relative overflow-hidden rounded-xl mb-0.5 ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Delete zone behind */}
            <div className="absolute right-0 top-0 bottom-0 w-[76px] bg-red-500 flex items-center justify-center rounded-r-xl md:hidden">
                <button
                    onClick={() => onDelete(expense.id)}
                    className="flex flex-col items-center gap-0.5 text-white text-[10px] font-semibold"
                >
                    <Trash2 size={14} />
                    Suppr.
                </button>
            </div>

            {/* Foreground card */}
            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={() => { if (swipeX !== 0) setSwipeX(0); }}
                onMouseEnter={() => setShowActions(true)}
                onMouseLeave={() => setShowActions(false)}
                className="relative flex items-center gap-2 py-2 px-2.5 bg-white dark:bg-neutral-900 rounded-xl cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                style={{
                    transform: `translateX(${swipeX}px)`,
                    transition: swiping ? 'none' : 'transform 0.2s ease',
                }}
            >
                {/* Category icon */}
                <div
                    className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-[13px] shrink-0"
                    style={{ backgroundColor: `${meta.color}10` }}
                >
                    {meta.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-neutral-900 dark:text-white leading-tight">
                        {expense.description || meta.label}
                    </p>
                    <div className="flex gap-1 mt-1">
                        {expense.isRecoverable && (
                            <span className="text-[8px] font-semibold px-1.5 py-px rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                                Récup.
                            </span>
                        )}
                        {expense.isDeductible && (
                            <span className="text-[8px] font-semibold px-1.5 py-px rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400">
                                Déductible
                            </span>
                        )}
                        {!expense.isRecoverable && !expense.isDeductible && (
                            <span className="text-[8px] font-medium px-1.5 py-px rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500">
                                Non récup.
                            </span>
                        )}
                    </div>
                </div>

                {/* Amount */}
                <span className="text-xs font-semibold text-neutral-900 dark:text-white tabular-nums shrink-0">
                    {formatCentsDecimal(expense.amount)}€
                </span>

                {/* Desktop hover actions */}
                {showActions && !isDeleting && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:flex gap-1">
                        {listingId && (
                            <Link
                                href={`/properties/${listingId}/expenses`}
                                className="w-7 h-7 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex items-center justify-center shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                                onClick={e => e.stopPropagation()}
                                title="Modifier"
                            >
                                <Pencil size={11} className="text-neutral-500 dark:text-neutral-400" />
                            </Link>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(expense.id); }}
                            className="w-7 h-7 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex items-center justify-center shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Supprimer"
                        >
                            <Trash2 size={11} className="text-red-500" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Group expenses by month ─────────────────────────────────

function groupByMonth(expenses: ExpenseItem[]): { key: string; label: string; items: ExpenseItem[] }[] {
    const groups: Record<string, { label: string; items: ExpenseItem[] }> = {};
    for (const e of expenses) {
        const d = new Date(e.date);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!groups[k]) {
            groups[k] = {
                label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
                items: [],
            };
        }
        groups[k].items.push(e);
    }
    return Object.entries(groups)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([key, val]) => ({ key, ...val }));
}

// ─── Main Component ──────────────────────────────────────────

const ExpensesTab: React.FC<ExpensesTabProps> = ({
    data, properties, onAddExpense, year,
    categoryBreakdown, upcomingExpenses, onMutate,
}) => {
    const [filterProperty, setFilterProperty] = useState<string>('all');
    const [filterMonth, setFilterMonth] = useState<number>(0); // 0 = all
    const [filterType, setFilterType] = useState<'all' | 'rec' | 'nrec'>('all');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Build propertyId → listingId lookup
    const propertyListingMap = new Map(properties.filter(p => p.listingId).map(p => [p.id, p.listingId!]));

    // Apply filters
    const filtered = data.filter(e => {
        if (filterProperty !== 'all' && e.propertyId !== filterProperty) return false;
        if (filterMonth > 0 && new Date(e.date).getMonth() + 1 !== filterMonth) return false;
        if (filterType === 'rec' && !e.isRecoverable) return false;
        if (filterType === 'nrec' && e.isRecoverable) return false;
        return true;
    });

    // Compute summary
    const totalAmount = filtered.reduce((s, e) => s + e.amount, 0);
    const totalRecoverable = filtered
        .filter(e => e.isRecoverable)
        .reduce((s, e) => s + Math.round(e.amount * e.recoverableRatio), 0);
    const totalNonRecoverable = totalAmount - totalRecoverable;
    const totalDeductible = filtered.reduce((s, e) => s + (e.amountDeductibleCents || 0), 0);

    const groups = groupByMonth(filtered);
    const hasFilters = filterProperty !== 'all' || filterMonth !== 0 || filterType !== 'all';

    // Delete handler with loading state + SWR revalidation
    const handleDelete = useCallback(async (id: string) => {
        if (deletingId) return; // Prevent double-click
        setDeletingId(id);
        try {
            await axios.delete(`/api/expenses/${id}`);
            toast.custom((t) => (
                <CustomToast t={t} message="Dépense supprimée" type="success" />
            ));
            onMutate?.(); // Revalidate SWR cache
        } catch {
            toast.custom((t) => (
                <CustomToast t={t} message="Erreur lors de la suppression" type="error" />
            ));
        } finally {
            setDeletingId(null);
        }
    }, [deletingId, onMutate]);

    return (
        <div>
            {/* Upcoming widget */}
            {upcomingExpenses && upcomingExpenses.length > 0 && (
                <UpcomingWidget items={upcomingExpenses} />
            )}

            {/* Breakdown widget */}
            {categoryBreakdown && categoryBreakdown.length > 0 && (
                <BreakdownWidget items={categoryBreakdown} year={year} />
            )}

            {/* Filters + Summary card */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-3 mb-2">
                {/* Month pills */}
                <div className="flex gap-0.5 overflow-x-auto pb-2 mb-2 border-b border-neutral-100 dark:border-neutral-800 no-scrollbar">
                    {MONTH_PILLS.map((m, i) => (
                        <button
                            key={m}
                            onClick={() => setFilterMonth(i)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 transition-all duration-150 ${
                                filterMonth === i
                                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                                    : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300'
                            }`}
                        >
                            {m}
                        </button>
                    ))}
                </div>

                {/* Type filter + property dropdown */}
                <div className="flex gap-1.5 items-center flex-wrap mb-2">
                    {[
                        { k: 'all' as const, l: 'Toutes' },
                        { k: 'rec' as const, l: 'Récup.' },
                        { k: 'nrec' as const, l: 'Non récup.' },
                    ].map(f => (
                        <button
                            key={f.k}
                            onClick={() => setFilterType(f.k)}
                            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-150 ${
                                filterType === f.k
                                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-2 border-neutral-900 dark:border-white'
                                    : 'border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-300 bg-white dark:bg-neutral-900'
                            }`}
                        >
                            {f.l}
                        </button>
                    ))}

                    <div className="flex-1" />

                    {properties.length > 1 && (
                        <select
                            value={filterProperty}
                            onChange={e => setFilterProperty(e.target.value)}
                            className="text-[10px] font-medium border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1 bg-white dark:bg-neutral-900 text-neutral-500 dark:text-neutral-300 cursor-pointer"
                        >
                            <option value="all">Tous les biens</option>
                            {properties.map(p => (
                                <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Summary line */}
                <div className="flex rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
                    {[
                        { l: 'Total', v: totalAmount, color: 'text-neutral-900 dark:text-white', bg: 'bg-white dark:bg-neutral-900' },
                        { l: 'Récup.', v: totalRecoverable, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/10' },
                        { l: 'Non récup.', v: totalNonRecoverable, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/10' },
                        { l: 'Déductible', v: totalDeductible, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/10' },
                    ].map((c, i) => (
                        <div
                            key={i}
                            className={`flex-1 py-2 px-1 text-center ${c.bg} ${i < 3 ? 'border-r border-neutral-200 dark:border-neutral-700' : ''}`}
                        >
                            <p className={`text-[8px] font-bold uppercase tracking-wide opacity-65 mb-0.5 ${c.color}`}>{c.l}</p>
                            <p className={`text-xs font-bold tabular-nums leading-tight ${c.color}`}>{formatCents(c.v)}€</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Header + Add button */}
            <div className="flex items-center justify-between py-2 px-0.5">
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                    {filtered.length} dépense{filtered.length > 1 ? 's' : ''}
                </span>
                <button
                    onClick={() => {
                        const selected = filterProperty !== 'all'
                            ? properties.find(p => p.id === filterProperty)
                            : undefined;
                        onAddExpense(selected?.listingId);
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
                >
                    <Plus size={14} />
                    Ajouter
                </button>
            </div>

            {/* Expense list */}
            {filtered.length === 0 ? (
                <div className="text-center py-16">
                    <Receipt size={48} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-4" />
                    <p className="text-neutral-500 dark:text-neutral-400 font-medium text-sm">
                        {hasFilters ? 'Aucun résultat pour ces filtres' : 'Aucune dépense'}
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                        {hasFilters
                            ? 'Essayez de modifier vos filtres.'
                            : 'Ajoutez vos premières dépenses pour suivre la rentabilité.'
                        }
                    </p>
                </div>
            ) : (
                <div>
                    <p className="text-[9px] text-neutral-400 dark:text-neutral-500 text-right mb-1 md:hidden">
                        ← glisser pour supprimer
                    </p>
                    {groups.map(group => (
                        <div key={group.key}>
                            {filterMonth === 0 && (
                                <p className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider py-2 px-0.5">
                                    {group.label}
                                </p>
                            )}
                            {group.items.map(expense => (
                                <ExpenseRow
                                    key={expense.id}
                                    expense={expense}
                                    listingId={propertyListingMap.get(expense.propertyId)}
                                    onDelete={handleDelete}
                                    isDeleting={deletingId === expense.id}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ExpensesTab;
