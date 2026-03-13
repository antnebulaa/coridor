'use client';

import { SafeUser, SafeProperty, SafeExpense, SafeRentalUnit } from "@/types";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
    Plus,
    Trash2,
    Pencil,
    Receipt,
    AlertTriangle,
    HelpCircle,
    Info,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    Droplets,
    Flame,
    Zap,
    Landmark,
    Gauge,
    Building2,
    Home,
    Construction,
    ArrowUpDown,
    CircleParking,
    Shield,
    ClipboardCheck,
    Wrench,
    UserRound,
    Paperclip,
    type LucideIcon,
} from "lucide-react";
import CustomToast from "@/components/ui/CustomToast";
import Container from "@/components/Container";
import EditPropertySidebar from "@/components/properties/EditPropertySidebar";
import Input from "@/components/inputs/SoftInput";
import ImageUpload from "@/components/inputs/ImageUpload";
import PageBody from "@/components/ui/PageBody";
import Modal from "@/components/modals/Modal";
import Heading from "@/components/Heading";
import { Link } from "@/i18n/navigation";

// ─── Category Config ──────────────────────────────────────

const CATEGORY_META: Record<string, { Icon: LucideIcon; label: string; color: string; recoverable: boolean; ratio: number; frequency?: string }> = {
    COLD_WATER:          { Icon: Droplets,       label: 'Eau Froide',             color: '#0891b2', recoverable: true, ratio: 1.0, frequency: 'QUARTERLY' },
    HOT_WATER:           { Icon: Flame,          label: 'Eau Chaude',             color: '#ea580c', recoverable: true, ratio: 1.0, frequency: 'QUARTERLY' },
    ELECTRICITY_COMMON:  { Icon: Zap,            label: 'Électricité (Commun)',   color: '#ca8a04', recoverable: true, ratio: 1.0, frequency: 'MONTHLY' },
    ELECTRICITY_PRIVATE: { Icon: Zap,            label: 'Électricité (Privé)',    color: '#a16207', recoverable: false, ratio: 0, frequency: 'MONTHLY' },
    HEATING_COLLECTIVE:  { Icon: Flame,          label: 'Chauffage Collectif',    color: '#dc2626', recoverable: true, ratio: 1.0, frequency: 'MONTHLY' },
    TAX_PROPERTY:        { Icon: Landmark,       label: 'Taxe Foncière',          color: '#7c3aed', recoverable: false, ratio: 0, frequency: 'YEARLY' },
    METERS:              { Icon: Gauge,          label: 'Compteurs',              color: '#0891b2', recoverable: true, ratio: 1.0, frequency: 'YEARLY' },
    GENERAL_CHARGES:     { Icon: Building2,      label: 'Charges communes',       color: '#4f46e5', recoverable: true, ratio: 1.0, frequency: 'QUARTERLY' },
    BUILDING_CHARGES:    { Icon: Construction,   label: 'Charges bâtiment',       color: '#6366f1', recoverable: true, ratio: 1.0, frequency: 'QUARTERLY' },
    ELEVATOR:            { Icon: ArrowUpDown,    label: 'Ascenseur',              color: '#8b5cf6', recoverable: true, ratio: 1.0, frequency: 'QUARTERLY' },
    PARKING:             { Icon: CircleParking,  label: 'Parking',                color: '#64748b', recoverable: false, ratio: 0, frequency: 'MONTHLY' },
    INSURANCE:           { Icon: Shield,         label: 'Assurance PNO',          color: '#2563eb', recoverable: false, ratio: 0, frequency: 'YEARLY' },
    INSURANCE_GLI:       { Icon: ClipboardCheck, label: 'Assurance GLI',          color: '#0d9488', recoverable: false, ratio: 0, frequency: 'YEARLY' },
    MAINTENANCE:         { Icon: Wrench,         label: 'Entretien',              color: '#d97706', recoverable: true, ratio: 1.0 },
    CARETAKER:           { Icon: UserRound,      label: 'Gardien',                color: '#e11d48', recoverable: true, ratio: 1.0, frequency: 'MONTHLY' },
    OTHER:               { Icon: Paperclip,      label: 'Autre',                  color: '#64748b', recoverable: false, ratio: 0 },
};

const DEDUCTIBILITY_RULES: Record<string, 'FULL' | 'PARTIAL' | 'NONE' | 'MANUAL'> = {
    TAX_PROPERTY: 'FULL', INSURANCE: 'FULL', INSURANCE_GLI: 'FULL', MAINTENANCE: 'FULL',
    CARETAKER: 'PARTIAL', ELEVATOR: 'PARTIAL', GENERAL_CHARGES: 'PARTIAL', BUILDING_CHARGES: 'PARTIAL',
    ELECTRICITY_COMMON: 'PARTIAL', HEATING_COLLECTIVE: 'PARTIAL',
    COLD_WATER: 'NONE', HOT_WATER: 'NONE', ELECTRICITY_PRIVATE: 'NONE', METERS: 'NONE', PARKING: 'NONE',
    OTHER: 'MANUAL',
};

const FREQUENCIES = [
    { value: 'ONCE', label: 'Ponctuelle' },
    { value: 'MONTHLY', label: 'Mensuelle' },
    { value: 'QUARTERLY', label: 'Trimestrielle' },
    { value: 'YEARLY', label: 'Annuelle' },
];

const FREQUENCY_LABELS: Record<string, string> = {
    ONCE: 'Ponctuel', MONTHLY: 'Mensuel', QUARTERLY: 'Trimestriel', YEARLY: 'Annuel',
};

const MONTH_PILLS = ['Tous', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

function formatEuros(cents: number): string {
    return Math.round(cents / 100).toLocaleString('fr-FR');
}

function formatEurosDecimal(cents: number): string {
    return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Upcoming Expenses Helper ─────────────────────────────

function getNextOccurrence(lastDate: Date, freq: string): Date {
    const y = lastDate.getFullYear();
    const m = lastDate.getMonth();
    const day = lastDate.getDate();
    if (freq === 'MONTHLY') {
        const target = new Date(y, m + 1, 1);
        const maxDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
        return new Date(target.getFullYear(), target.getMonth(), Math.min(day, maxDay));
    } else if (freq === 'QUARTERLY') {
        const target = new Date(y, m + 3, 1);
        const maxDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
        return new Date(target.getFullYear(), target.getMonth(), Math.min(day, maxDay));
    } else if (freq === 'YEARLY') {
        const maxDay = new Date(y + 1, m + 1, 0).getDate();
        return new Date(y + 1, m, Math.min(day, maxDay));
    }
    return new Date(lastDate);
}

// ─── Upcoming Widget ──────────────────────────────────────

interface UpcomingItem {
    label: string;
    category: string;
    frequency: string;
    amount: number; // cents
    nextDate: Date;
}

const UpcomingWidget: React.FC<{ expenses: SafeExpense[] }> = ({ expenses }) => {
    const [expanded, setExpanded] = useState(false);

    const upcomingItems = useMemo(() => {
        const now = new Date();
        const limit = new Date(now.getFullYear(), now.getMonth() + 12, now.getDate());
        const recurring = expenses.filter(e => e.frequency && e.frequency !== 'ONCE');

        const items: UpcomingItem[] = [];
        const seen = new Set<string>();

        for (const exp of recurring) {
            const key = `${exp.category}|${exp.label}`;
            if (seen.has(key)) continue;
            seen.add(key);

            const nextDate = getNextOccurrence(new Date(exp.dateOccurred), exp.frequency);
            if (nextDate <= limit) {
                items.push({
                    label: exp.label,
                    category: exp.category,
                    frequency: exp.frequency,
                    amount: exp.amountTotalCents,
                    nextDate,
                });
            }
        }

        return items.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime()).slice(0, 10);
    }, [expenses]);

    if (upcomingItems.length === 0) return null;

    const totalAmount = upcomingItems.reduce((s, e) => s + e.amount, 0);

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-[#e8e4dc] dark:border-neutral-700 p-4 mb-3">
            {/* Header — clickable to expand */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center justify-between w-full"
            >
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#18160f] dark:text-white">À venir</span>
                    <span className="text-xs font-medium bg-[#fef9ee] text-[#b45309] px-2 py-1.5 rounded-full">
                        ~{formatEuros(totalAmount)}€
                    </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-[#9e9890]">
                    <span>12 prochains mois</span>
                    <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* Items — hidden by default */}
            {expanded && (
                <>
                    <div className="flex flex-col mt-3">
                        {upcomingItems.map((item, i) => {
                            const cat = CATEGORY_META[item.category] || CATEGORY_META.OTHER;
                            return (
                                <div key={`${item.category}-${item.label}-${i}`}>
                                    {i > 0 && <div className="border-t border-[#f0ede7] dark:border-neutral-700" />}
                                    <div className="flex items-center gap-3 py-2.5">
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: `${cat.color}10` }}
                                        >
                                            <cat.Icon size={16} style={{ color: cat.color }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm font-medium text-[#18160f] dark:text-white truncate block">
                                                {item.label}
                                            </span>
                                            <span className="text-xs text-[#9e9890]">
                                                {FREQUENCY_LABELS[item.frequency] || item.frequency}
                                            </span>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-sm font-semibold text-[#18160f] dark:text-white tabular-nums">
                                                {formatEurosDecimal(item.amount)}€
                                            </span>
                                            <span className="text-xs text-[#9e9890] block">
                                                {format(item.nextDate, 'd MMM', { locale: fr })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

// ─── Breakdown Widget ─────────────────────────────────────

const BreakdownWidget: React.FC<{ expenses: SafeExpense[]; year: number }> = ({ expenses, year }) => {
    const [hovered, setHovered] = useState<string | null>(null);

    const breakdown = useMemo(() => {
        const map: Record<string, number> = {};
        for (const exp of expenses) {
            map[exp.category] = (map[exp.category] || 0) + exp.amountTotalCents;
        }
        return Object.entries(map)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount);
    }, [expenses]);

    if (breakdown.length === 0) return null;

    const total = breakdown.reduce((s, b) => s + b.amount, 0);

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl dark:border-neutral-700  mb-5">
            <p className="text-base font-medium text-[#18160f] dark:text-white mb-2">
                Répartition des charges {year}
            </p>

            {/* Bar */}
            <div className="h-4 w-full cursor-pointer rounded-full flex overflow-hidden mb-3">
                {breakdown.map(({ category, amount }) => {
                    const cat = CATEGORY_META[category] || CATEGORY_META.OTHER;
                    const pct = (amount / total) * 100;
                    return (
                        <div
                            key={category}
                            style={{
                                width: `${pct}%`,
                                backgroundColor: cat.color,
                                opacity: hovered && hovered !== category ? 0.2 : 1,
                                transition: 'opacity 0.15s',
                            }}
                            className="h-full"
                            onMouseEnter={() => setHovered(category)}
                            onMouseLeave={() => setHovered(null)}
                        />
                    );
                })}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-1 gap-x-6">
                {breakdown.map(({ category, amount }) => {
                    const cat = CATEGORY_META[category] || CATEGORY_META.OTHER;
                    const pct = Math.round((amount / total) * 100);
                    return (
                        <div
                            key={category}
                            className="flex items-center justify-between gap-2 py-0.5 cursor-pointer"
                            style={{ opacity: hovered && hovered !== category ? 0.3 : 1, transition: 'opacity 0.15s' }}
                            onMouseEnter={() => setHovered(category)}
                            onMouseLeave={() => setHovered(null)}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                                <span className="text-sm text-[#3f3f3f] dark:text-neutral-400 truncate">{cat.label}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-sm text-[#9e9890]">{pct}%</span>
                                <span className="text-sm text-neutral-200">|</span>
                                <span className="text-sm font-medium text-[#18160f] dark:text-white tabular-nums">{formatEuros(amount)}€</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ─── Expense Row ──────────────────────────────────────────

const ExpenseRow: React.FC<{
    expense: SafeExpense;
    onEdit: () => void;
    onDelete: () => void;
    isDeleting?: boolean;
}> = ({ expense, onEdit, onDelete, isDeleting }) => {
    const cat = CATEGORY_META[expense.category] || CATEGORY_META.OTHER;
    const isLocked = !!expense.isFinalized;
    const touchStartX = useRef(0);
    const [translateX, setTranslateX] = useState(0);
    const [swiping, setSwiping] = useState(false);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (isLocked) return;
        touchStartX.current = e.touches[0].clientX;
        setSwiping(true);
    };
    const handleTouchMove = (e: React.TouchEvent) => {
        if (!swiping || isLocked) return;
        const diff = e.touches[0].clientX - touchStartX.current;
        // Only allow left swipe
        setTranslateX(Math.max(-80, Math.min(0, diff)));
    };
    const handleTouchEnd = () => {
        if (isLocked) return;
        setSwiping(false);
        if (translateX < -40) {
            setTranslateX(-76);
        } else {
            setTranslateX(0);
        }
    };

    // Close swipe on tap elsewhere
    useEffect(() => {
        if (translateX !== 0) {
            const handler = () => setTranslateX(0);
            window.addEventListener('touchstart', handler, { once: true });
            return () => window.removeEventListener('touchstart', handler);
        }
    }, [translateX]);

    return (
        <div className={`relative overflow-hidden ${isDeleting ? 'opacity-50 pointer-events-none' : ''} ${isLocked ? 'opacity-60' : ''}`}>
            {/* Delete background (mobile) */}
            {!isLocked && (
                <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-4 md:hidden">
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="flex items-center gap-1.5 text-white text-xs font-semibold"
                    >
                        <Trash2 size={16} />
                        Suppr.
                    </button>
                </div>
            )}

            {/* Foreground row */}
            <div
                className={`relative bg-[#ffffff] dark:bg-neutral-900 transition-colors group ${isLocked ? 'cursor-default' : 'cursor-pointer md:hover:bg-[#eeebe4] dark:md:hover:bg-neutral-800'}`}
                style={{
                    transform: `translateX(${translateX}px)`,
                    transition: swiping ? 'none' : 'transform 0.2s ease',
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={() => { if (!isLocked && translateX === 0) onEdit(); }}
            >
                <div className="py-3 px-1 flex items-center gap-3">
                    {/* Icon */}
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${cat.color}10` }}
                    >
                        <cat.Icon size={20} style={{ color: cat.color }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-[#18160f] dark:text-white truncate block">
                            {expense.label}
                        </span>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                            {expense.isRecoverable && (expense.amountRecoverableCents || 0) > 0 ? (
                                <span className="text-[11px] font-medium px-1.5 py-px rounded-full bg-[#edf7f2] text-[#0a7a5a]">
                                    Récup.
                                </span>
                            ) : null}
                            {(expense.amountDeductibleCents || 0) > 0 && (
                                <span className="text-[11px] font-medium px-1.5 py-px rounded-full bg-[#f3f0ff] text-[#6d28d9]">
                                    Déductible
                                </span>
                            )}
                            {!expense.isRecoverable && (expense.amountDeductibleCents || 0) === 0 && (
                                <span className="text-[11px] font-medium px-1.5 py-px rounded-full bg-[#f6f4f0] text-[#9e9890]">
                                    Non récup.
                                </span>
                            )}
                            {expense.isFinalized && (
                                <span className="text-[11px] font-medium px-1.5 py-px rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-500">
                                    Régularisé
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Amount + Desktop actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-semibold text-[#18160f] dark:text-white tabular-nums">
                            {formatEurosDecimal(expense.amountTotalCents)}€
                        </span>

                        {/* Desktop hover actions — hidden if finalized */}
                        {!isLocked && (
                            <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                    className="w-[26px] h-[26px] rounded-full border border-[#e8e4dc] dark:border-neutral-600 flex items-center justify-center hover:bg-white dark:hover:bg-neutral-700 transition shadow-sm"
                                >
                                    <Pencil size={11} className="text-[#6b6660] dark:text-neutral-400" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                    className="w-[26px] h-[26px] rounded-full border border-[#e8e4dc] dark:border-neutral-600 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 transition shadow-sm"
                                >
                                    <Trash2 size={11} className="text-red-500" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────

interface SwitcherProperty {
    listingId: string;
    title: string;
    address: string;
    city: string;
    imageUrl: string | null;
    expenses: { amountTotalCents: number; year: number }[];
}

interface ExpensesClientProps {
    property: SafeProperty & { expenses: SafeExpense[], rentalUnits: SafeRentalUnit[] };
    currentUser: SafeUser;
    title: string;
    listingId: string;
    switcherProperties?: SwitcherProperty[];
}

const ExpensesClient: React.FC<ExpensesClientProps> = ({
    property,
    currentUser,
    title,
    listingId,
    switcherProperties = [],
}) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [switcherOpen, setSwitcherOpen] = useState(false);
    const switcherRef = useRef<HTMLDivElement>(null);
    const hasMultipleProperties = switcherProperties.length > 1;

    // Close switcher on click outside
    useEffect(() => {
        if (!switcherOpen) return;
        const handler = (e: MouseEvent) => {
            if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) setSwitcherOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [switcherOpen]);

    enum STEPS { CATEGORY = 0, DETAILS = 1, PROOF = 2 }

    const [step, setStep] = useState(STEPS.CATEGORY);
    const [isOpen, setIsOpen] = useState(false);

    // Form State
    const [category, setCategory] = useState('COLD_WATER');
    const [label, setLabel] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [frequency, setFrequency] = useState('ONCE');
    const [isRecoverable, setIsRecoverable] = useState(true);
    const [recoverableAmount, setRecoverableAmount] = useState('0');
    const [deductibleAmount, setDeductibleAmount] = useState('0');
    const [rentalUnitId, setRentalUnitId] = useState('');
    const [proofUrl, setProofUrl] = useState('');

    // Edit Mode
    const [editingExpense, setEditingExpense] = useState<SafeExpense | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Auto-calculate deductible
    useEffect(() => {
        const rule = DEDUCTIBILITY_RULES[category];
        if (!rule || rule === 'MANUAL') return;
        const parsedAmount = parseFloat(amount || '0');
        const parsedRecoverable = parseFloat(recoverableAmount || '0');
        const amountCents = Math.round(parsedAmount * 100);
        const recoverableCents = Math.round(parsedRecoverable * 100);
        let deductibleCents = 0;
        if (rule === 'FULL') deductibleCents = amountCents;
        else if (rule === 'PARTIAL') deductibleCents = Math.max(0, amountCents - recoverableCents);
        setDeductibleAmount(String(deductibleCents / 100));
    }, [category, amount, recoverableAmount]);

    // Filters
    const currentYear = new Date().getFullYear();
    const [filterCategories, setFilterCategories] = useState<string[]>([]);
    const [filterRecoverable, setFilterRecoverable] = useState<Set<string>>(new Set());
    const [filterMonth, setFilterMonth] = useState<number | null>(null);
    const [filterYear, setFilterYear] = useState<number>(currentYear);

    // Filtered expenses
    const filteredExpenses = useMemo(() => {
        return property.expenses.filter((expense) => {
            if (filterCategories.length > 0 && !filterCategories.includes(expense.category)) return false;
            if (filterRecoverable.size > 0) {
                const hasRecoverablePart = (expense.amountRecoverableCents || 0) > 0;
                const hasNonRecoverablePart = expense.amountTotalCents - (expense.amountRecoverableCents || 0) > 0;
                const hasDeductiblePart = (expense.amountDeductibleCents || 0) > 0;
                const matchesAny =
                    (filterRecoverable.has('recoverable') && hasRecoverablePart) ||
                    (filterRecoverable.has('non-recoverable') && hasNonRecoverablePart) ||
                    (filterRecoverable.has('deductible') && hasDeductiblePart);
                if (!matchesAny) return false;
            }
            const expenseDate = new Date(expense.dateOccurred);
            if (expenseDate.getFullYear() !== filterYear) return false;
            if (filterMonth !== null && expenseDate.getMonth() !== filterMonth) return false;
            return true;
        });
    }, [property.expenses, filterCategories, filterRecoverable, filterMonth, filterYear]);

    const hasFilters = filterCategories.length > 0 || filterRecoverable.size > 0 || filterMonth !== null;

    // Year-filtered expenses for widgets
    const yearExpenses = useMemo(() => {
        return property.expenses.filter(e => new Date(e.dateOccurred).getFullYear() === filterYear);
    }, [property.expenses, filterYear]);

    // Year + month filtered expenses (for KPIs & breakdown)
    const periodExpenses = useMemo(() => {
        if (filterMonth === null) return yearExpenses;
        return yearExpenses.filter(e => new Date(e.dateOccurred).getMonth() === filterMonth);
    }, [yearExpenses, filterMonth]);

    // Period-level totals for hero KPI
    const yearStats = useMemo(() => {
        const total = periodExpenses.reduce((s, e) => s + e.amountTotalCents, 0);
        const recoverable = periodExpenses.reduce((s, e) => s + (e.amountRecoverableCents || 0), 0);
        const deductible = periodExpenses.reduce((s, e) => s + (e.amountDeductibleCents || 0), 0);
        return { total, recoverable, nonRecoverable: total - recoverable, deductible };
    }, [periodExpenses]);

    // ─── Form Handlers ────────────────────────────────────

    const hasWarning = useMemo(() => {
        if ((category === 'INSURANCE' || category === 'ELECTRICITY_PRIVATE') && isRecoverable) {
            return "Attention, cette charge n'est légalement pas récupérable sur le locataire.";
        }
        return null;
    }, [category, isRecoverable]);

    const handleCategoryChange = (value: string) => {
        const oldCat = CATEGORY_META[category];
        setCategory(value);
        const cat = CATEGORY_META[value];
        if (cat) {
            setIsRecoverable(cat.recoverable);
            if (cat.recoverable) setRecoverableAmount(amount || '0');
            else setRecoverableAmount('0');
            if (cat.frequency) setFrequency(cat.frequency);
            if (!label || (oldCat && label === oldCat.label)) {
                setLabel(cat.label);
            }
        }
        setStep(STEPS.DETAILS);
    };

    const onClose = () => {
        setIsOpen(false);
        setTimeout(() => {
            setStep(STEPS.CATEGORY);
            setLabel('');
            setAmount('');
            setRecoverableAmount('0');
            setDeductibleAmount('0');
            setIsRecoverable(true);
            setProofUrl('');
            setDate(new Date().toISOString().split('T')[0]);
            setFrequency('ONCE');
            setEditingExpense(null);
        }, 300);
    };

    const handleEdit = useCallback((expense: SafeExpense) => {
        setCategory(expense.category);
        setLabel(expense.label);
        setAmount(String(expense.amountTotalCents / 100));
        setDate(expense.dateOccurred.split('T')[0]);
        setFrequency(expense.frequency);
        setIsRecoverable(expense.isRecoverable);
        setRecoverableAmount(String((expense.amountRecoverableCents || 0) / 100));
        setDeductibleAmount(String((expense.amountDeductibleCents || 0) / 100));
        setRentalUnitId(expense.rentalUnitId || '');
        setProofUrl(expense.proofUrl || '');
        setEditingExpense(expense);
        setStep(STEPS.DETAILS);
        setIsOpen(true);
    }, [STEPS.DETAILS]);

    const handleSubmit = useCallback(() => {
        setIsLoading(true);
        const parsedAmount = parseFloat(amount || '0');
        const parsedRecoverable = parseFloat(recoverableAmount || '0');
        const parsedDeductible = parseFloat(deductibleAmount || '0');

        if (isNaN(parsedAmount) || (isRecoverable && isNaN(parsedRecoverable)) || isNaN(parsedDeductible)) {
            toast.custom((t) => <CustomToast t={t} message="Veuillez entrer des montants valides" type="error" />);
            setIsLoading(false);
            return;
        }

        const amountCents = Math.round(parsedAmount * 100);
        const amountRecoverableCents = isRecoverable ? Math.round(parsedRecoverable * 100) : 0;

        if (amountRecoverableCents > amountCents) {
            toast.custom((t) => <CustomToast t={t} message="Le montant récupérable ne peut pas dépasser le total" type="error" />);
            setIsLoading(false);
            return;
        }

        const computedRatio = amountCents > 0 ? amountRecoverableCents / amountCents : 0;

        const payload = {
            category, label,
            amountTotalCents: amountCents,
            dateOccurred: date,
            frequency,
            isRecoverable,
            recoverableRatio: computedRatio,
            amountRecoverableCents,
            amountDeductibleCents: Math.round(parsedDeductible * 100),
            rentalUnitId: rentalUnitId || null,
            proofUrl,
        };

        const request = editingExpense
            ? axios.patch(`/api/expenses/${editingExpense.id}`, payload)
            : axios.post(`/api/properties/${property.id}/expenses`, { ...payload, propertyId: property.id });

        request
            .then((res) => {
                toast.custom((t) => <CustomToast t={t} message={editingExpense ? 'Dépense modifiée' : 'Dépense ajoutée'} type="success" />);
                if (res.data?.warning === 'YEAR_ALREADY_REGULARIZED') {
                    setTimeout(() => {
                        toast.custom((t) => <CustomToast t={t} message="Cette année a déjà été régularisée. Cette dépense ne sera pas incluse dans la régularisation existante." type="warning" />, { duration: 6000 });
                    }, 500);
                }
                onClose();
                router.refresh();
            })
            .catch(() => {
                toast.custom((t) => <CustomToast t={t} message="Erreur lors de l'enregistrement" type="error" />);
            })
            .finally(() => setIsLoading(false));
    }, [property.id, category, label, amount, date, frequency, isRecoverable, recoverableAmount, deductibleAmount, rentalUnitId, router, editingExpense, proofUrl]);

    const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleDelete = useCallback((expense: SafeExpense) => {
        if (deletingId) return;
        setDeletingId(expense.id);

        // Show undo toast — delay actual deletion by 4s
        const toastId = toast.custom((t) => (
            <div className="bg-[#18160f] text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 text-sm">
                <span>Dépense supprimée</span>
                <button
                    onClick={() => {
                        // Cancel deletion
                        if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
                        setDeletingId(null);
                        toast.dismiss(t.id);
                        toast.custom((t2) => <CustomToast t={t2} message="Suppression annulée" type="success" />, { duration: 2000 });
                    }}
                    className="font-semibold text-emerald-400 hover:text-emerald-300 transition"
                >
                    Annuler
                </button>
            </div>
        ), { duration: 4500 });

        deleteTimeoutRef.current = setTimeout(() => {
            axios.delete(`/api/expenses/${expense.id}`)
                .then(() => {
                    router.refresh();
                })
                .catch(() => {
                    toast.custom((t) => <CustomToast t={t} message="Erreur lors de la suppression" type="error" />);
                })
                .finally(() => setDeletingId(null));
        }, 4000);
    }, [router, deletingId]);

    const onSidebarTabChange = useCallback((tab: string) => {
        router.push(`/properties/${listingId}/edit`);
    }, [router, listingId]);

    const onSidebarSectionChange = useCallback((section: string) => {
        if (section !== 'expenses') {
            router.push(`/properties/${listingId}/edit?section=${section}`);
        }
    }, [router, listingId]);

    // ─── Modal Steps ──────────────────────────────────────

    const actionLabel = useMemo(() => {
        if (step === STEPS.DETAILS) return 'Continuer';
        if (step === STEPS.PROOF) return editingExpense ? 'Enregistrer' : 'Ajouter';
        return undefined;
    }, [step, editingExpense, STEPS.DETAILS, STEPS.PROOF]);

    const secondaryActionLabel = useMemo(() => {
        if (step === STEPS.DETAILS || step === STEPS.PROOF) return 'Retour';
        return 'Annuler';
    }, [step, STEPS.DETAILS, STEPS.PROOF]);

    const secondaryAction = useMemo(() => {
        if (step === STEPS.DETAILS || step === STEPS.PROOF) return () => setStep(s => s - 1);
        return onClose;
    }, [step, STEPS.DETAILS, STEPS.PROOF]);

    const onSubmit = useCallback(() => {
        if (step !== STEPS.PROOF) return setStep(s => s + 1);
        return handleSubmit();
    }, [step, handleSubmit, STEPS.PROOF]);

    // ─── Modal Body ───────────────────────────────────────

    let bodyContent = (
        <div className="flex flex-col gap-4">
            <Heading title="Type de dépense" subtitle="De quoi s'agit-il ?" />
            <div
                className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-px pb-2 custom-scrollbar"
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
            >
                {Object.entries(CATEGORY_META).map(([value, cat]) => (
                    <div
                        key={value}
                        onClick={() => handleCategoryChange(value)}
                        className={`
                            p-4 rounded-xl border cursor-pointer transition flex flex-col items-center justify-center gap-3 text-center hover:bg-[#f3efe8] dark:hover:bg-neutral-700
                            ${category === value ? 'border-2 border-[#18160f] dark:border-white' : 'border border-[#e8e4dc] dark:border-neutral-700'}
                        `}
                    >
                        <cat.Icon size={28} style={{ color: cat.color }} />
                        <span className="text-sm font-medium text-[#18160f] dark:text-white">{cat.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    if (step === STEPS.DETAILS) {
        const currentCat = CATEGORY_META[category] || CATEGORY_META.OTHER;
        bodyContent = (
            <div className="flex flex-col gap-4">
                <Heading
                    title={editingExpense ? "Modifier la dépense" : "Détails"}
                    subtitle={editingExpense ? "Modifiez les informations" : "Complétez les informations"}
                />

                {/* Selected category badge */}
                <div className="flex items-center gap-3 p-3 py-4 bg-[#f3efe8] dark:bg-neutral-800 rounded-xl mb-2">
                    <currentCat.Icon size={20} style={{ color: currentCat.color }} />
                    <span className="font-medium text-[#18160f] dark:text-white">{currentCat.label}</span>
                    <button
                        onClick={() => setStep(STEPS.CATEGORY)}
                        className="ml-auto text-sm font-medium underline text-[#9e9890] hover:text-[#a8825e]"
                    >
                        Modifier
                    </button>
                </div>

                <Input
                    id="label"
                    label="Libellé (ex: Facture Suez Janvier)"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    disabled={isLoading}
                    required
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        id="amount"
                        label="Montant (€)"
                        type="number"
                        inputMode="decimal"
                        formatPrice
                        value={amount}
                        onChange={(e) => {
                            const val = e.target.value;
                            setAmount(val);
                            if (isRecoverable) {
                                const catMeta = CATEGORY_META[category];
                                if (catMeta && catMeta.ratio === 1.0) setRecoverableAmount(val);
                            }
                        }}
                        disabled={isLoading}
                        required
                    />
                    <Input
                        id="date"
                        label="Date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        disabled={isLoading}
                        required
                    />
                </div>

                 <hr className="border-[#f0ede7] dark:border-neutral-700 mt-2" />

                {/* Frequency */}
                <div className="flex flex-col gap-2 mb-2">
                    <label className="text-xl font-medium text-[#6b6660] dark:text-neutral-400">Fréquence</label>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
                        {FREQUENCIES.map((freq) => (
                            <button
                                key={freq.value}
                                onClick={() => setFrequency(freq.value)}
                                className={`px-3 py-2 rounded-full border text-sm font-medium transition whitespace-nowrap shrink-0
                                    ${frequency === freq.value
                                        ? 'bg-[#18160f] text-white border-[#18160f]'
                                        : 'bg-neutral-100 dark:bg-neutral-800 text-[#6b6660] dark:text-neutral-300 border-[#e8e4dc] dark:border-neutral-600 hover:border-[#9e9890]'}`}
                            >
                                {freq.label}
                            </button>
                        ))}
                    </div>
                    {frequency === 'YEARLY' && (
                        <div className="text-xs text-[#9e9890] flex items-center gap-1 mt-1 bg-[#f6f4f0] dark:bg-neutral-800 p-2 rounded-lg">
                            <Info size={14} />
                            Cette dépense sera lissée mensuellement dans vos stats.
                        </div>
                    )}
                </div>

                <hr className="border-[#f0ede7] dark:border-neutral-700" />

                {/* Recovery Settings */}
                <div className="flex flex-col gap-4">
                    {(() => {
                        const catMeta = CATEGORY_META[category];
                        const locked = catMeta && !catMeta.recoverable;
                        return (
                            <>
                                <div className="flex flex-col gap-1 ">
                                    <span className="font-medium text-xl text-[#18160f] dark:text-white">Charge récupérable ?</span>
                                    {locked && (
                                        <span className="text-sm text-neutral-500">Non récupérable légalement pour cette catégorie</span>
                                    )}
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (locked) return;
                                                setIsRecoverable(true);
                                                if (!recoverableAmount) setRecoverableAmount(amount);
                                            }}
                                            className={`flex-1 py-2.5 px-4 rounded-2xl text-sm font-medium border transition-all ${
                                                locked
                                                    ? 'opacity-40 cursor-not-allowed border-neutral-200 dark:border-neutral-700 text-neutral-400'
                                                    : isRecoverable
                                                        ? 'bg-[#0a7a5a] border-[#0a7a5a] text-white'
                                                        : 'bg-white dark:bg-neutral-800 border-[#e8e4dc] dark:border-neutral-700 text-[#3d3a32] dark:text-neutral-300 hover:border-[#0a7a5a]/40'
                                            }`}
                                        >
                                            Récupérable
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (locked) return;
                                                setIsRecoverable(false);
                                            }}
                                            className={`flex-1 py-5 px-4 rounded-2xl text-sm font-medium border transition-all ${
                                                locked
                                                    ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 text-neutral-800 cursor-not-allowed'
                                                    : !isRecoverable
                                                        ? 'bg-[#18160f] border-[#18160f] text-white dark:bg-white dark:border-white dark:text-neutral-900'
                                                        : 'bg-white dark:bg-neutral-800 border-[#e8e4dc] dark:border-neutral-700 text-[#3d3a32] dark:text-neutral-300 hover:border-neutral-400'
                                            }`}
                                        >
                                            Non récupérable
                                        </button>
                                    </div>
                                </div>

                                {hasWarning && !locked && (
                                    <div className="bg-[#fdf0ed] text-[#c4321a] p-3 rounded-lg text-sm flex items-start gap-2">
                                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                        {hasWarning}
                                    </div>
                                )}
                            </>
                        );
                    })()}

                    {isRecoverable && (
                        <Input
                            id="recoverableAmount"
                            label="Montant récupérable (€)"
                            type="number"
                            inputMode="decimal"
                            formatPrice
                            value={recoverableAmount}
                            onChange={(e) => setRecoverableAmount(e.target.value)}
                            disabled={isLoading}
                        />
                    )}

                     <hr className="border-[#f0ede7] dark:border-neutral-700 mt-1" />

                    {/* Deductible */}
                    <div className="mb-5">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl font-medium text-[#272727] dark:text-neutral-300">Déductibilité Fiscale</span>
                            <div className="group relative">
                                <HelpCircle size={14} className="text-[#9e9890] cursor-help" />
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-[#18160f] text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
                                    Une charge déductible réduit votre base imposable.
                                </div>
                            </div>
                        </div>
                        <Input
                            id="deductibleAmount"
                            label="Montant déductible (€)"
                            type="number"
                            inputMode="decimal"
                            formatPrice
                            value={deductibleAmount}
                            onChange={(e) => setDeductibleAmount(e.target.value)}
                            disabled={isLoading || DEDUCTIBILITY_RULES[category] !== 'MANUAL'}
                        />
                        <p className="text-xs text-[#9e9890] mt-1">
                            {DEDUCTIBILITY_RULES[category] === 'FULL' && "100% déductible de vos revenus fonciers"}
                            {DEDUCTIBILITY_RULES[category] === 'PARTIAL' && "Montant non récupérable = déductible"}
                            {DEDUCTIBILITY_RULES[category] === 'NONE' && "Non déductible (charge récupérable)"}
                            {DEDUCTIBILITY_RULES[category] === 'MANUAL' && "Saisissez le montant déductible manuellement"}
                        </p>
                    </div>
                </div>

                {/* Delete link in edit mode */}
                {editingExpense && !editingExpense.isFinalized && (
                    <button
                        onClick={() => {
                            if (window.confirm('Supprimer cette dépense ?')) {
                                handleDelete(editingExpense);
                                onClose();
                            }
                        }}
                        className="text-xs text-[#c4321a] font-semibold mt-2 hover:underline self-start"
                    >
                        Supprimer cette dépense
                    </button>
                )}
            </div>
        );
    }

    if (step === STEPS.PROOF) {
        const currentCat = CATEGORY_META[category] || CATEGORY_META.OTHER;
        bodyContent = (
            <div className="flex flex-col gap-4">
                <Heading title="Justificatif" subtitle="Ajoutez une photo si vous le souhaitez." />

                <div className="bg-[#f6f4f0] dark:bg-neutral-800 p-4 rounded-xl mb-2 text-sm text-[#6b6660] dark:text-neutral-400">
                    Prenez en photo votre facture ou ticket de caisse.
                </div>

                <ImageUpload value={proofUrl} onChange={(value) => setProofUrl(value)} />

                {/* Recap */}
                <div className="bg-[#f3efe8] dark:bg-neutral-800 rounded-xl p-3 mt-2">
                    <p className="text-[10px] font-semibold text-[#9e9890] uppercase tracking-wider mb-2">Récapitulatif</p>
                    <div className="flex items-center gap-2 mb-1.5">
                        <currentCat.Icon size={16} style={{ color: currentCat.color }} />
                        <span className="text-sm font-medium text-[#18160f] dark:text-white">{label || currentCat.label}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-[#6b6660] dark:text-neutral-400">
                        <span>Montant : <strong className="text-[#18160f] dark:text-white">{amount || '0'}€</strong></span>
                        <span>Date : <strong className="text-[#18160f] dark:text-white">{date}</strong></span>
                        <span>Fréquence : <strong className="text-[#18160f] dark:text-white">{FREQUENCY_LABELS[frequency]}</strong></span>
                        <span>Récupérable : <strong className="text-[#18160f] dark:text-white">{isRecoverable ? 'Oui' : 'Non'}</strong></span>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Group expenses by month ──────────────────────────

    const groupedExpenses = useMemo(() => {
        const groups: { label: string; expenses: SafeExpense[] }[] = [];
        let currentLabel = '';

        for (const exp of filteredExpenses) {
            const monthLabel = format(new Date(exp.dateOccurred), 'MMMM yyyy', { locale: fr }).toUpperCase();
            if (monthLabel !== currentLabel) {
                currentLabel = monthLabel;
                groups.push({ label: monthLabel, expenses: [] });
            }
            groups[groups.length - 1].expenses.push(exp);
        }

        return groups;
    }, [filteredExpenses]);



    return (
        <Container>
            <div className="grid grid-cols-1 md:grid-cols-[400px_1fr] gap-10 md:pt-10">
                {/* Sidebar */}
                <div className="hidden md:block col-span-1">
                    <div className="flex items-center gap-4 mb-6">
                        <button
                            onClick={() => router.push('/properties')}
                            className="p-2 rounded-full hover:bg-[#f3efe8] dark:hover:bg-neutral-800 transition cursor-pointer"
                        >
                            <ArrowLeft size={24} className="text-[#18160f] dark:text-white" />
                        </button>
                        <div className="text-2xl font-medium text-[#18160f] dark:text-white">
                            Modification d&apos;annonce
                        </div>
                    </div>
                    <EditPropertySidebar
                        activeTab="location"
                        activeSection="expenses"
                        onChangeTab={onSidebarTabChange}
                        onChangeSection={onSidebarSectionChange}
                    />
                </div>

                {/* Main Content */}
                <div className="block">
                    {/* Desktop Title + Year Selector */}
                    <div className="hidden md:flex h-10 items-center justify-between mb-6">
                        <h2 className="text-2xl font-medium text-[#18160f] dark:text-white">
                            Dépenses & Charges
                        </h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setFilterYear(y => y - 1)}
                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f3efe8] dark:hover:bg-neutral-800 transition text-[#6b6660]"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <span className="text-base font-bold tabular-nums text-[#18160f] dark:text-white min-w-10 text-center">
                                {filterYear}
                            </span>
                            <button
                                onClick={() => setFilterYear(y => y + 1)}
                                disabled={filterYear >= currentYear}
                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f3efe8] dark:hover:bg-neutral-800 transition text-[#6b6660] disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Content Box */}
                    <div className="md:border md:border-[#e8e4dc] dark:md:border-neutral-800 md:rounded-xl relative bg-[#ffffff] dark:bg-neutral-900 min-h-[50vh] -mx-4 md:mx-0">
                        <PageBody padVertical={false} className="px-4 md:px-8 md:py-8 py-6 pb-32 md:pb-8">
                            {/* Mobile Title + Year Selector */}
                            <div className="md:hidden flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-medium text-[#18160f] dark:text-white">
                                    Dépenses & Charges
                                </h2>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setFilterYear(y => y - 1)}
                                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#e8e4dc] dark:hover:bg-neutral-800 transition text-[#6b6660]"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <span className="text-base font-medium tabular-nums text-[#18160f] dark:text-white min-w-10 text-center">
                                        {filterYear}
                                    </span>
                                    <button
                                        onClick={() => setFilterYear(y => y + 1)}
                                        disabled={filterYear >= currentYear}
                                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#e8e4dc] dark:hover:bg-neutral-800 transition text-[#6b6660] disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Property Switcher — Glass Morphism */}
                            <div ref={switcherRef} className="relative mb-2" style={{ zIndex: switcherOpen ? 10000 : 'auto' }}>
                                {/* Trigger */}
                                <button
                                    onClick={() => hasMultipleProperties && setSwitcherOpen(o => !o)}
                                    className={`w-full flex items-center gap-3 border transition-all duration-250 ${hasMultipleProperties ? 'cursor-pointer' : 'cursor-default'}`}
                                    style={{
                                        padding: '12px 16px',
                                        background: switcherOpen ? 'hex(255,255,255,0.85)' : 'rgba(255,255,255,0.6)',
                                        backdropFilter: 'blur(20px) saturate(1.2)',
                                        WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
                                        borderColor: switcherOpen ? 'rgba(168,130,94,0.4)' : '#e8e4dc',
                                        borderRadius: switcherOpen ? '16px 16px 0 0' : '16px',
                                        boxShadow: switcherOpen
                                            ? '0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)'
                                            : '0 2px 8px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.6)',
                                    }}
                                >
                                    <div
                                        className="shrink-0 overflow-hidden"
                                        style={{
                                            width: 50, height: 50, borderRadius: 12,
                                            border: '1px solid #d4c4a8',
                                        }}
                                    >
                                        {(property as any).images?.[0]?.url ? (
                                            <img src={(property as any).images[0].url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-[#FE3C10]">
                                                <Home size={18} className="text-[#ffffff]" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className="text-base font-medium text-[#18160f] dark:text-white truncate leading-tight">{title}</p>
                                        <p className="text-[12px] text-[#6b6660] dark:text-neutral-400 truncate mt-0.5">
                                            {property.addressLine1 || property.address}{property.city ? `, ${property.city}` : ''}
                                        </p>
                                    </div>
                                    {hasMultipleProperties && (
                                        <ChevronDown
                                            size={14}
                                            className="text-[#a8825e] shrink-0"
                                            style={{
                                                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                                transform: switcherOpen ? 'rotate(180deg)' : 'rotate(0)',
                                            }}
                                        />
                                    )}
                                </button>

                                {/* Glass Dropdown Panel — absolute, scrollable */}
                                {switcherOpen && (
                                    <>
                                        {/* Backdrop — covers entire screen including navbar */}
                                        <div
                                            className="fixed inset-0 z-[10000]"
                                            onClick={() => setSwitcherOpen(false)}
                                        />
                                        <div
                                            className="absolute top-full left-0 right-0 z-[10001] overflow-y-auto overscroll-contain"
                                            style={{
                                                maxHeight: '60vh',
                                                background: 'rgba(255,255,255,0.82)',
                                                backdropFilter: 'blur(24px) saturate(1.3)',
                                                WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
                                                border: '1px solid rgba(168,130,94,0.3)',
                                                borderTop: '1px solid rgba(255,255,255,0.3)',
                                                borderRadius: '0 0 16px 16px',
                                                boxShadow: '0 16px 48px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
                                                animation: 'glassDrop 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                                WebkitOverflowScrolling: 'touch',
                                            }}
                                        >
                                            <style>{`
                                                @keyframes glassDrop { from { opacity:0; transform: translateY(-4px); } to { opacity:1; transform: translateY(0); } }
                                                @keyframes glassItem { from { opacity:0; transform: translateY(4px); } to { opacity:1; transform: translateY(0); } }
                                            `}</style>

                                            {switcherProperties.map((sp, i) => {
                                                const isActive = sp.listingId === listingId;
                                                return (
                                                    <button
                                                        key={sp.listingId}
                                                        onClick={() => {
                                                            if (!isActive) router.push(`/properties/${sp.listingId}/expenses`);
                                                            setSwitcherOpen(false);
                                                        }}
                                                        className="w-full flex items-center gap-3 border-0 transition-colors duration-150"
                                                        style={{
                                                            padding: '14px 16px',
                                                            cursor: 'pointer',
                                                            background: isActive ? 'linear-gradient(90deg, rgba(168,130,94,0.12) 0%, transparent 100%)' : 'transparent',
                                                            borderBottom: i < switcherProperties.length - 1 ? '4px solid rgba(0,0,0,0.04)' : 'none',
                                                            animation: `glassItem 0.2s ease-out ${i * 0.04}s both`,
                                                        }}
                                                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(168,130,94,0.05)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = isActive ? 'linear-gradient(90deg, rgba(168,130,94,0.12) 0%, transparent 100%)' : 'transparent'; }}
                                                    >
                                                        <div
                                                            className="shrink-0 relative overflow-hidden transition-all duration-200"
                                                            style={{
                                                                width: 50, height: 50, borderRadius: 16,
                                                                border: isActive ? '2px solid #a8825e' : '1px solid rgba(0,0,0,0.06)',
                                                                boxShadow: isActive ? '0 2px 8px rgba(168,130,94,0.25)' : 'none',
                                                            }}
                                                        >
                                                            {sp.imageUrl ? (
                                                                <img src={sp.imageUrl} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-[#FE3C10]">
                                                                    <Home size={16} className="text-[#ffffff]" />
                                                                </div>
                                                            )}
                                                            {isActive && (
                                                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0 text-left">
                                                            <p className={`text-[15px] truncate ${isActive ? 'font-semibold text-[#18160f]' : 'font-medium text-[#18160f]'}`}>
                                                                {sp.title}
                                                            </p>
                                                            <p className="text-xs text-[#9e9890] truncate mt-0.5">
                                                                {sp.address}{sp.city ? `, ${sp.city}` : ''}
                                                            </p>
                                                        </div>
                                                        {(() => {
                                                            const yearExpenses = sp.expenses.filter(e => e.year === filterYear);
                                                            const total = yearExpenses.reduce((s, e) => s + e.amountTotalCents, 0);
                                                            const count = yearExpenses.length;
                                                            return (
                                                                <div className="text-right shrink-0">
                                                                    <p className={`text-sm font-semibold tabular-nums ${isActive ? 'text-[#a8825e]' : 'text-[#3d3a32]'}`}>
                                                                        {formatEuros(total)}€
                                                                    </p>
                                                                   
                                                                </div>
                                                            );
                                                        })()}
                                                    </button>
                                                );
                                            })}

                                            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
                                                <Link
                                                    href="/properties"
                                                    className="text-sm text-[#a8825e] font-medium flex items-center gap-1 justify-center hover:opacity-80 transition"
                                                >
                                                    <Plus size={15} />
                                                    Ajouter un bien
                                                </Link>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Upcoming Widget */}
                            <UpcomingWidget expenses={property.expenses} />

                          

                            {/* Month pills */}
                                    <div className="flex gap-1.5 overflow-x-auto pb-1 pt-4 -mx-1 px-1 scrollbar-hide">
                                        {MONTH_PILLS.map((m, i) => {
                                            const isActive = i === 0 ? filterMonth === null : filterMonth === i - 1;
                                            return (
                                                <button
                                                    key={m}
                                                    onClick={() => setFilterMonth(i === 0 ? null : i - 1)}
                                                    className={`px-4 py-1.5 rounded-full text-base font-medium transition whitespace-nowrap shrink-0
                                                        ${isActive
                                                            ? 'bg-[#18160f] dark:bg-white text-white dark:text-neutral-900'
                                                            : 'text-[#9e9890] bg-neutral-100  hover:text-[#6b6660] dark:hover:text-neutral-300'}`}
                                                >
                                                    {m}
                                                </button>
                                            );
                                        })}
                                    </div>

                            {/* ===== KPI FILTER BAR (fused: KPIs + type filter) ===== */}
                            {property.expenses.length > 0 && (
                                <div className="flex flex-col gap-2 mb-4">
                                    {/* Total en gros */}
                                    <div className="mt-3 mb-3">
                                        <p className="text-xs font-medium mb-1 text-[#5f5e5c] dark:text-neutral-500 uppercase tracking-wide">Dépenses {filterMonth !== null ? `${MONTH_PILLS[filterMonth + 1]} ${filterYear}` : filterYear}</p>
                                        <p className="text-4xl md:text-3xl font-medium tabular-nums text-[#18160f] dark:text-white">{formatEuros(yearStats.total)}€</p>
                                    </div>

                                      {/* Breakdown Widget */}
                            <BreakdownWidget expenses={periodExpenses} year={filterYear} />

                                    {/* 3 filter cards — checkbox (cumulative) */}
                                    <div className="grid grid-cols-3 gap-3 mt-2">
                                        {([
                                            { key: 'recoverable', label: 'Récupérable', amount: yearStats.recoverable, color: 'bg-neutral-700', bg: 'bg-neutral-100 dark:bg-neutral-800', bgActive: 'bg-[#FE3C10]', textActive: 'text-white', labelActive: 'text-white/75' },
                                            { key: 'non-recoverable', label: 'Non récup.', amount: yearStats.nonRecoverable, color: 'bg-neutral-700', bg: 'bg-neutral-100 dark:bg-neutral-800', bgActive: 'bg-[#FE3C10]', textActive: 'text-white', labelActive: 'text-white/75' },
                                            { key: 'deductible', label: 'Déductible', amount: yearStats.deductible, color: 'bg-neutral-700', bg: 'bg-neutral-100 dark:bg-neutral-800', bgActive: 'bg-[#FE3C10]', textActive: 'text-white', labelActive: 'text-white/75' },
                                        ]).map((cell) => {
                                            const isActive = filterRecoverable.has(cell.key);
                                            return (
                                                <button
                                                    key={cell.key}
                                                    onClick={() => setFilterRecoverable(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(cell.key)) next.delete(cell.key);
                                                        else next.add(cell.key);
                                                        return next;
                                                    })}
                                                    className={`rounded-2xl py-3 px-1.5 text-center transition-colors ${isActive ? `${cell.bgActive} border-transparent` : `${cell.bg} border-[#e8e4dc] dark:border-neutral-700`}`}
                                                >
                                                    <p className={`text-[11px] font-normal uppercase pb-1 tracking-wide ${isActive ? cell.labelActive : 'opacity-70'}`} style={!isActive ? { color: cell.color } : undefined}>
                                                        {isActive ? ' ' : ''}{cell.label}
                                                    </p>
                                                    <p className={`text-lg md:text-base font-medium tabular-nums ${isActive ? cell.textActive : ''}`} style={!isActive ? { color: cell.color } : undefined}>
                                                        {formatEuros(cell.amount)}€
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>

                                </div>
                            )}

                            {/* ===== EXPENSE LIST ===== */}
                            {property.expenses.length === 0 ? (
                                <div className="p-10 flex flex-col items-center justify-center text-center border-1 mt-3 border-[#e8e4dc] dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800">
                                    <div className="p-4 bg-[#f3efe8] dark:bg-neutral-700 rounded-full mb-4">
                                        <Receipt size={32} className="text-[#9e9890]" />
                                    </div>
                                    <h3 className="text-lg font-medium text-[#18160f] dark:text-white">Aucune dépense</h3>
                                    <p className="text-[#9e9890] max-w-sm mt-2 mb-6">Ajoutez vos factures pour suivre la rentabilité et préparer les régularisations.</p>
                                    <button
                                        onClick={() => setIsOpen(true)}
                                        className="px-4 py-2.5 bg-[#18160f] dark:bg-white text-white dark:text-neutral-900 rounded-xl text-sm font-semibold hover:opacity-90 transition"
                                    >
                                        Ajouter ma première dépense
                                    </button>
                                </div>
                            ) : filteredExpenses.length === 0 ? (
                                <div className="p-8 flex flex-col items-center justify-center text-center border-dashed border-2 border-[#e8e4dc] dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800">
                                    <p className="text-[#9e9890] mb-4">
                                        {hasFilters ? 'Aucun résultat pour ces filtres' : 'Aucune dépense cette année'}
                                    </p>
                                    {hasFilters && (
                                        <button
                                            onClick={() => { setFilterCategories([]); setFilterRecoverable(new Set()); setFilterMonth(null); }}
                                            className="px-3 py-1.5 rounded-full bg-[#18160f] dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:opacity-90 transition"
                                        >
                                            Réinitialiser les filtres
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    {groupedExpenses.map((group) => (
                                        <div key={group.label}>
                                            {/* Month header (only when not filtering specific month) */}
                                            {filterMonth === null && (
                                                <p className="text-[12px] font-semibold text-[#9e9890] uppercase tracking-widest px-1 pt-4 pb-2">
                                                    {group.label}
                                                </p>
                                            )}
                                            <div className="flex flex-col divide-y divide-[#e8e4dc]/60 dark:divide-neutral-700/60">
                                                {group.expenses.map((expense) => (
                                                    <ExpenseRow
                                                        key={expense.id}
                                                        expense={expense}
                                                        onEdit={() => handleEdit(expense)}
                                                        onDelete={() => handleDelete(expense)}
                                                        isDeleting={deletingId === expense.id}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </PageBody>
                    </div>
                </div>
            </div>

            {/* Modal (Add/Edit) */}
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                onSubmit={onSubmit}
                actionLabel={actionLabel}
                secondaryActionLabel={secondaryActionLabel}
                secondaryAction={secondaryAction}
                body={bodyContent}
                disabled={isLoading}
            />

            {/* FAB */}
            {property.expenses.length > 0 && (
                <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-5 md:bottom-10 md:right-10 z-50">
                    <button
                        onClick={() => setIsOpen(true)}
                        className="px-4 py-3 bg-[#18160f] dark:bg-white text-white dark:text-neutral-900 rounded-full shadow-lg hover:opacity-90 transition flex items-center gap-2 text-sm font-semibold"
                    >
                        <Plus size={18} />
                        Ajouter une dépense
                    </button>
                </div>
            )}
        </Container>
    );
};

export default ExpensesClient;
