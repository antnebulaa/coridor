'use client';

import { SafeUser, SafeProperty, SafeExpense, SafeRentalUnit } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import RegularizationModal from "../../components/RegularizationModal";
import FinancialDashboard from "../../components/analytics/FinancialDashboard";
import {
    Plus,
    Trash2,
    Receipt,
    AlertTriangle,
    Droplets,
    Zap,
    Flame,
    Building,
    Shield,
    Wrench,
    UserCheck,
    HelpCircle,
    Info,
    Camera,
    Gauge,
    Layers,
    Building2,
    Car,
    FileCheck2,
    ChevronLeft,
    ArrowLeft,
    RotateCcw
} from "lucide-react";

import Container from "@/components/Container";
import EditPropertySidebar from "@/components/properties/EditPropertySidebar";
import Heading from "@/components/Heading";
import { Button } from "@/components/ui/Button";
import Modal from "@/components/modals/Modal";
import Input from "@/components/inputs/SoftInput";
import ImageUpload from "@/components/inputs/ImageUpload";
import PageBody from "@/components/ui/PageBody";
import CircleButton from "@/components/ui/CircleButton";
import DarkActionButton from "@/components/ui/DarkActionButton";
import SwipeableExpenseItem from "./components/SwipeableExpenseItem";

// Enums mapping
const EXPENSE_CATEGORIES = [
    { value: 'COLD_WATER', label: 'Eau Froide', icon: Droplets, recoverable: true, ratio: 1.0, color: 'text-blue-600', bg: 'bg-blue-100' },
    { value: 'HOT_WATER', label: 'Eau Chaude', icon: Flame, recoverable: true, ratio: 1.0, color: 'text-orange-600', bg: 'bg-orange-100' },
    { value: 'ELECTRICITY_COMMON', label: 'Électricité (Commun)', icon: Zap, recoverable: true, ratio: 1.0, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { value: 'ELECTRICITY_PRIVATE', label: 'Électricité (Privé)', icon: Zap, recoverable: false, ratio: 0, color: 'text-yellow-700', bg: 'bg-yellow-50' },
    { value: 'HEATING_COLLECTIVE', label: 'Chauffage Collectif', icon: Flame, recoverable: true, ratio: 1.0, color: 'text-red-600', bg: 'bg-red-100' },
    { value: 'TAX_PROPERTY', label: 'Taxe Foncière', icon: Building, recoverable: false, ratio: 0, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { value: 'METERS', label: 'Compteurs', icon: Gauge, recoverable: true, ratio: 1.0, color: 'text-cyan-600', bg: 'bg-cyan-100' },
    { value: 'GENERAL_CHARGES', label: 'Charges communes générales', icon: Layers, recoverable: true, ratio: 1.0, color: 'text-gray-600', bg: 'bg-gray-100' },
    { value: 'BUILDING_CHARGES', label: 'Charges bâtiment', icon: Building2, recoverable: true, ratio: 1.0, color: 'text-stone-600', bg: 'bg-stone-100' },
    { value: 'ELEVATOR', label: 'Ascenseur', icon: Building, recoverable: true, ratio: 1.0, color: 'text-purple-600', bg: 'bg-purple-100' },
    { value: 'PARKING', label: 'Parking', icon: Car, recoverable: false, ratio: 0, color: 'text-neutral-600', bg: 'bg-neutral-100' },
    { value: 'INSURANCE', label: 'Assurance PNO', icon: Shield, recoverable: false, ratio: 0, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { value: 'INSURANCE_GLI', label: 'Assurance GLI', icon: FileCheck2, recoverable: false, ratio: 0, color: 'text-teal-600', bg: 'bg-teal-100' },
    { value: 'MAINTENANCE', label: 'Entretien / Ménage', icon: Wrench, recoverable: true, ratio: 1.0, color: 'text-lime-600', bg: 'bg-lime-100' },
    { value: 'CARETAKER', label: 'Gardien', icon: UserCheck, recoverable: true, ratio: 1.0, color: 'text-rose-600', bg: 'bg-rose-100' },
    { value: 'OTHER', label: 'Autre', icon: HelpCircle, recoverable: false, ratio: 0, color: 'text-slate-600', bg: 'bg-slate-100' },
];

const DEDUCTIBILITY_RULES: Record<string, 'FULL' | 'PARTIAL' | 'NONE' | 'MANUAL'> = {
    TAX_PROPERTY: 'FULL',
    INSURANCE: 'FULL',
    INSURANCE_GLI: 'FULL',
    MAINTENANCE: 'FULL',
    CARETAKER: 'PARTIAL',
    ELEVATOR: 'PARTIAL',
    GENERAL_CHARGES: 'PARTIAL',
    BUILDING_CHARGES: 'PARTIAL',
    ELECTRICITY_COMMON: 'PARTIAL',
    HEATING_COLLECTIVE: 'PARTIAL',
    COLD_WATER: 'NONE',
    HOT_WATER: 'NONE',
    ELECTRICITY_PRIVATE: 'NONE',
    METERS: 'NONE',
    PARKING: 'NONE',
    OTHER: 'MANUAL',
};

const FREQUENCIES = [
    { value: 'ONCE', label: 'Ponctuel' },
    { value: 'MONTHLY', label: 'Mensuel' },
    { value: 'QUARTERLY', label: 'Trimestriel' },
    { value: 'YEARLY', label: 'Annuel' },
];

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

interface ExpensesClientProps {
    property: SafeProperty & { expenses: SafeExpense[], rentalUnits: SafeRentalUnit[] };
    currentUser: SafeUser;
    title: string;
    listingId: string;
}

const ExpensesClient: React.FC<ExpensesClientProps> = ({
    property,
    currentUser,
    title,
    listingId
}) => {
    const router = useRouter();
    const params = useParams();
    const [isLoading, setIsLoading] = useState(false);
    enum STEPS {
        CATEGORY = 0,
        DETAILS = 1,
        PROOF = 2,
    }

    const [step, setStep] = useState(STEPS.CATEGORY);
    const [isOpen, setIsOpen] = useState(false);
    const [isRegularizationModalOpen, setIsRegularizationModalOpen] = useState(false);

    // Form State
    const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].value);
    const [label, setLabel] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [frequency, setFrequency] = useState('ONCE');
    const [isRecoverable, setIsRecoverable] = useState(true);
    const [recoverableAmount, setRecoverableAmount] = useState('0');
    const [deductibleAmount, setDeductibleAmount] = useState('0');
    const [rentalUnitId, setRentalUnitId] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [proofUrl, setProofUrl] = useState('');

    // Auto-calculate deductible amount based on category
    useEffect(() => {
        const rule = DEDUCTIBILITY_RULES[category];
        if (!rule || rule === 'MANUAL') return; // Don't auto-set for OTHER

        const parsedAmount = parseFloat(amount || '0');
        const parsedRecoverable = parseFloat(recoverableAmount || '0');
        const amountCents = Math.round(parsedAmount * 100);
        const recoverableCents = Math.round(parsedRecoverable * 100);

        let deductibleCents = 0;
        if (rule === 'FULL') {
            deductibleCents = amountCents;
        } else if (rule === 'PARTIAL') {
            deductibleCents = Math.max(0, amountCents - recoverableCents);
        }
        // NONE: stays 0

        setDeductibleAmount(String(deductibleCents / 100));
    }, [category, amount, recoverableAmount]);

    // Edit Mode State
    const [editingExpense, setEditingExpense] = useState<SafeExpense | null>(null);

    // Filter State
    const currentYear = new Date().getFullYear();
    const [filterCategories, setFilterCategories] = useState<string[]>([]);
    const [filterRecoverable, setFilterRecoverable] = useState<'all' | 'recoverable' | 'non-recoverable'>('all');
    const [filterMonth, setFilterMonth] = useState<number | null>(null);
    const [filterYear, setFilterYear] = useState<number>(currentYear);

    // Filtered expenses (client-side)
    const filteredExpenses = useMemo(() => {
        return property.expenses.filter((expense) => {
            if (filterCategories.length > 0 && !filterCategories.includes(expense.category)) {
                return false;
            }
            if (filterRecoverable === 'recoverable' && !expense.isRecoverable) return false;
            if (filterRecoverable === 'non-recoverable' && expense.isRecoverable) return false;
            const expenseDate = new Date(expense.dateOccurred);
            if (expenseDate.getFullYear() !== filterYear) return false;
            if (filterMonth !== null && expenseDate.getMonth() !== filterMonth) return false;
            return true;
        });
    }, [property.expenses, filterCategories, filterRecoverable, filterMonth, filterYear]);

    // Summary indicators
    const summaryStats = useMemo(() => {
        const total = filteredExpenses.reduce((sum, e) => sum + e.amountTotalCents, 0);
        const recoverable = filteredExpenses.reduce((sum, e) => sum + (e.amountRecoverableCents || 0), 0);
        const nonRecoverable = total - recoverable;
        const deductible = filteredExpenses.reduce((sum, e) => sum + (e.amountDeductibleCents || 0), 0);
        return {
            total: total / 100,
            recoverable: recoverable / 100,
            nonRecoverable: nonRecoverable / 100,
            deductible: deductible / 100,
            count: filteredExpenses.length,
            recoverablePercent: total > 0 ? Math.round((recoverable / total) * 100) : 0,
        };
    }, [filteredExpenses]);

    const hasActiveFilters = filterCategories.length > 0 || filterRecoverable !== 'all' || filterMonth !== null || filterYear !== currentYear;

    const resetFilters = () => {
        setFilterCategories([]);
        setFilterRecoverable('all');
        setFilterMonth(null);
        setFilterYear(currentYear);
    };

    const onBack = () => {
        setStep((value) => value - 1);
    };

    const onNext = () => {
        setStep((value) => value + 1);
    };

    const handleCategoryChange = (value: string) => {
        const oldCategory = EXPENSE_CATEGORIES.find(c => c.value === category);
        setCategory(value);
        const cat = EXPENSE_CATEGORIES.find(c => c.value === value);
        if (cat) {
            setIsRecoverable(cat.recoverable);
            if (!label || (oldCategory && label === oldCategory.label)) {
                setLabel(cat.label);
            }
        }
        onNext();
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
            setSelectedCategory('');
            setProofUrl('');
            setDate(new Date().toISOString().split('T')[0]);
            setEditingExpense(null);
        }, 300);
    }

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

    const onSidebarTabChange = useCallback((tab: string) => {
        router.push(`/properties/${listingId}/edit`);
    }, [router, listingId]);

    const onSidebarSectionChange = useCallback((section: string) => {
        if (section !== 'expenses') {
            router.push(`/properties/${listingId}/edit?section=${section}`);
        }
    }, [router, property.id]);

    const hasWarning = useMemo(() => {
        if ((category === 'INSURANCE' || category === 'ELECTRICITY_PRIVATE') && isRecoverable) {
            return "Attention, cette charge n\'est légalement pas récupérable sur le locataire.";
        }
        return null;
    }, [category, isRecoverable]);

    const handleSubmit = useCallback(() => {
        setIsLoading(true);
        const parsedAmount = parseFloat(amount || '0');
        const parsedRecoverable = parseFloat(recoverableAmount || '0');
        const parsedDeductible = parseFloat(deductibleAmount || '0');

        if (isNaN(parsedAmount) || (isRecoverable && isNaN(parsedRecoverable)) || isNaN(parsedDeductible)) {
            toast.error('Veuillez entrer des montants valides');
            setIsLoading(false);
            return;
        }

        const amountCents = Math.round(parsedAmount * 100);
        const amountRecoverableCents = isRecoverable
            ? Math.round(parsedRecoverable * 100)
            : 0;

        if (amountRecoverableCents > amountCents) {
            toast.error('Le montant récupérable ne peut pas dépasser le montant total');
            setIsLoading(false);
            return;
        }

        const computedRatio = amountCents > 0 ? amountRecoverableCents / amountCents : 0;

        const payload = {
            category,
            label,
            amountTotalCents: amountCents,
            dateOccurred: date,
            frequency,
            isRecoverable,
            recoverableRatio: computedRatio,
            amountRecoverableCents,
            amountDeductibleCents: Math.round(parsedDeductible * 100),
            rentalUnitId: rentalUnitId || null,
            proofUrl
        };

        const request = editingExpense
            ? axios.patch(`/api/expenses/${editingExpense.id}`, payload)
            : axios.post(`/api/properties/${property.id}/expenses`, { ...payload, propertyId: property.id });

        request
            .then(() => {
                toast.success(editingExpense ? 'Dépense modifiée !' : 'Dépense ajoutée !');
                setIsOpen(false);
                router.refresh();
                setTimeout(() => {
                    setLabel('');
                    setAmount('');
                    setProofUrl('');
                    setStep(STEPS.CATEGORY);
                    setEditingExpense(null);
                }, 300);
            })
            .catch(() => {
                toast.error(editingExpense ? 'Erreur lors de la modification' : 'Erreur lors de l\'ajout');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [property.id, category, label, amount, date, frequency, isRecoverable, recoverableAmount, deductibleAmount, rentalUnitId, router, editingExpense, proofUrl, STEPS.CATEGORY]);

    const handleDelete = useCallback((id: string) => {
        if (!window.confirm('Supprimer cette dépense ?')) return;
        setIsLoading(true);
        axios.delete(`/api/expenses/${id}`)
            .then(() => {
                toast.success('Supprimé');
                router.refresh();
            })
            .catch(() => toast.error('Erreur'))
            .finally(() => setIsLoading(false));
    }, [router]);

    const actionLabel = useMemo(() => {
        if (step === STEPS.DETAILS) {
            return 'Continuer';
        }
        if (step === STEPS.PROOF) {
            return editingExpense ? 'Enregistrer' : 'Ajouter';
        }
        return undefined;
    }, [step, editingExpense, STEPS.DETAILS, STEPS.PROOF]);

    const secondaryActionLabel = useMemo(() => {
        if (step === STEPS.DETAILS || step === STEPS.PROOF) {
            return 'Retour';
        }
        return 'Annuler';
    }, [step]);

    const secondaryAction = useMemo(() => {
        if (step === STEPS.DETAILS || step === STEPS.PROOF) {
            return onBack;
        }
        return onClose;
    }, [step]);

    const onSubmit = useCallback(() => {
        if (step !== STEPS.PROOF) {
            return onNext();
        }
        return handleSubmit();
    }, [step, handleSubmit]);

    // ... Modal Body Content Construction ...
    let bodyContent = (
        <div className="flex flex-col gap-4">
            <Heading title="Type de dépense" subtitle="De quoi s'agit-il ?" />
            <div
                className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto mb-2 custom-scrollbar pr-1"
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
            >
                {EXPENSE_CATEGORIES.map((cat) => (
                    <div
                        key={cat.value}
                        onClick={() => handleCategoryChange(cat.value)}
                        className={`
                        p-4 rounded-xl border cursor-pointer transition flex flex-col items-center justify-center gap-3 text-center hover:bg-neutral-50
                        ${category === cat.value ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-neutral-200'}
                    `}
                    >
                        <cat.icon size={32} className="text-neutral-700" />
                        <span className="text-sm font-medium">{cat.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    if (step === STEPS.DETAILS) {
        bodyContent = (
            <div className="flex flex-col gap-4">
                <Heading title={editingExpense ? "Modifier la dépense" : "Détails"} subtitle={editingExpense ? "Modifiez les informations" : "Complétez les informations"} />

                <div className="flex items-center gap-3 p-3 bg-neutral-100 rounded-xl mb-2">
                    {(() => {
                        const CurrentIcon = EXPENSE_CATEGORIES.find(c => c.value === category)?.icon || HelpCircle;
                        return <CurrentIcon size={24} className="text-neutral-700" />
                    })()}
                    <span className="font-medium text-neutral-900">
                        {EXPENSE_CATEGORIES.find(c => c.value === category)?.label}
                    </span>
                    <button onClick={onBack} className="ml-auto text-xs font-semibold underline text-neutral-500 hover:text-black">
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
                        onChange={(e) => setAmount(e.target.value)}
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

                {/* List Type / Frequency */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-neutral-600">Fréquence</label>
                    <div className="flex gap-2">
                        {FREQUENCIES.map((freq) => (
                            <div
                                key={freq.value}
                                onClick={() => setFrequency(freq.value)}
                                className={`
                                px-3 py-2 rounded-full border text-xs font-medium cursor-pointer transition
                                ${frequency === freq.value
                                        ? 'bg-neutral-900 text-white border-neutral-900'
                                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'}
                            `}
                            >
                                {freq.label}
                            </div>
                        ))}
                    </div>
                    {frequency === 'YEARLY' && (
                        <div className="text-xs text-neutral-500 flex items-center gap-1 mt-1 bg-neutral-100 p-2 rounded-lg">
                            <Info size={14} />
                            Cette dépense sera lissée mensuellement dans vos stats.
                        </div>
                    )}
                </div>

                <hr />

                {/* Recovery Settings */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="font-semibold text-neutral-900">Charge récupérable ?</span>
                            <span className="text-xs text-neutral-500">Facturable au locataire</span>
                        </div>
                        <div
                            onClick={() => {
                                const newValue = !isRecoverable;
                                setIsRecoverable(newValue);
                                if (newValue && !recoverableAmount) {
                                    setRecoverableAmount(amount);
                                }
                            }}
                            className={`
                            w-12 h-6 rounded-full relative cursor-pointer transition
                            ${isRecoverable ? 'bg-green-500' : 'bg-neutral-200'}
                        `}
                        >
                            <div className={`
                            absolute top-1 w-4 h-4 rounded-full bg-white transition-all
                            ${isRecoverable ? 'left-7' : 'left-1'}
                        `} />
                        </div>
                    </div>

                    {hasWarning && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2">
                            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                            {hasWarning}
                        </div>
                    )}

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

                    {/* Deductible Amount Input */}
                    <div className="mt-4 pt-4 border-t border-dashed border-neutral-200">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-medium text-neutral-700">Déductibilité Fiscale</span>
                            <div className="group relative">
                                <HelpCircle size={14} className="text-neutral-400 cursor-help" />
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-neutral-900 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
                                    Une charge déductible réduit votre base imposable. La plupart des charges réelles sont déductibles (ex: travaux, assurances, charges de copro non récupérables).
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
                        <p className="text-xs text-neutral-500 mt-1">
                            {DEDUCTIBILITY_RULES[category] === 'FULL' && "100% déductible de vos revenus fonciers"}
                            {DEDUCTIBILITY_RULES[category] === 'PARTIAL' && "Montant non récupérable = déductible"}
                            {DEDUCTIBILITY_RULES[category] === 'NONE' && "Non déductible (charge récupérable)"}
                            {DEDUCTIBILITY_RULES[category] === 'MANUAL' && "Saisissez le montant déductible manuellement"}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (step === STEPS.PROOF) {
        bodyContent = (
            <div className="flex flex-col gap-4">
                <Heading
                    title="Justificatif"
                    subtitle="Ajoutez une photo si vous le souhaitez."
                />

                <div className="bg-neutral-50 p-4 rounded-xl mb-4 text-sm text-neutral-500">
                    <p>Prenez en photo votre facture ou ticket de caisse. C&#39;est utile pour les impots et pour justifier les charges aux locataires.</p>
                </div>

                <ImageUpload
                    value={proofUrl}
                    onChange={(value) => setProofUrl(value)}
                />
            </div>
        );
    }

    return (
        <Container>
            <RegularizationModal
                isOpen={isRegularizationModalOpen}
                onClose={() => setIsRegularizationModalOpen(false)}
                propertyId={property.id}
            />

            <div className="flex flex-col h-full bg-white">
                {/* Header - Fixed */}
                <div className="flex-none p-4 border-b flex justify-between items-center bg-white z-10">
                    <div>
                        <h1 className="text-xl font-bold">Dépenses</h1>
                        <p className="text-sm text-neutral-500">Suivi des charges et travaux</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsRegularizationModalOpen(true)}
                            className="px-3 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 transition"
                        >
                            Régul. Annuelle
                        </button>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[400px_1fr] gap-10 pt-0">
                {/* Sidebar - Hidden on mobile */}
                <div className="hidden md:block col-span-1 md:pt-0">
                    <div className="flex items-center gap-4 mb-6">
                        <button
                            onClick={() => router.push('/properties')}
                            className="
                                p-2
                                rounded-full
                                hover:bg-neutral-100
                                transition
                                cursor-pointer
                            "
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div className="text-2xl font-medium">
                            Modification d&#39;annonce
                        </div>
                    </div>

                    <EditPropertySidebar
                        activeTab="location"
                        activeSection="expenses"
                        onChangeTab={onSidebarTabChange}
                        onChangeSection={onSidebarSectionChange}
                    />
                </div>

                {/* Main Content Area */}
                <div className="block">
                    {/* Desktop Title */}
                    <div className="hidden md:flex h-10 items-center mb-6">
                        <h2 className="text-2xl font-medium">
                            Dépenses & Charges
                        </h2>
                    </div>

                    {/* Content Box */}
                    <div className="md:border md:border-neutral-200 md:rounded-xl relative bg-neutral-100 dark:bg-neutral-900 dark:border-neutral-800 min-h-[50vh] -mx-4 md:mx-0">

                        <PageBody padVertical={false} className="px-4 md:px-8 md:py-8 py-6">
                            {/* Mobile Section Title (Non-sticky) */}
                            <div className="md:hidden mb-6">
                                <h2 className="text-2xl font-medium">
                                    Dépenses & Charges
                                </h2>
                            </div>

                            <FinancialDashboard propertyId={property.id} />

                            {/* ===== FILTER BAR ===== */}
                            {property.expenses.length > 0 && (
                                <div className="flex flex-col gap-3 mb-6 mt-6">
                                    {/* Year Pills */}
                                    <div className="flex gap-2 bg-white dark:bg-neutral-800 p-1.5 rounded-2xl overflow-x-auto max-w-full">
                                        {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                                            <button
                                                key={y}
                                                onClick={() => { setFilterYear(y); setFilterMonth(null); }}
                                                className={`px-4 py-2 rounded-2xl text-sm font-medium transition whitespace-nowrap
                                                    ${filterYear === y ? 'bg-neutral-900 text-white shadow-sm' : 'text-neutral-500 hover:text-black dark:hover:text-white'}`}
                                            >
                                                {y}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Month Pills */}
                                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                                        <button
                                            onClick={() => setFilterMonth(null)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap
                                                ${filterMonth === null ? 'bg-neutral-900 text-white' : 'bg-white dark:bg-neutral-800 text-neutral-600 hover:bg-neutral-200'}`}
                                        >
                                            Tous
                                        </button>
                                        {MONTH_LABELS.map((m, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setFilterMonth(i)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap
                                                    ${filterMonth === i ? 'bg-neutral-900 text-white' : 'bg-white dark:bg-neutral-800 text-neutral-600 hover:bg-neutral-200'}`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Recoverable Toggle */}
                                    <div className="flex gap-2">
                                        {([
                                            { value: 'all' as const, label: 'Toutes' },
                                            { value: 'recoverable' as const, label: 'Récupérables' },
                                            { value: 'non-recoverable' as const, label: 'Non récup.' }
                                        ]).map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setFilterRecoverable(opt.value)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition
                                                    ${filterRecoverable === opt.value
                                                        ? 'bg-neutral-900 text-white'
                                                        : 'bg-white dark:bg-neutral-800 text-neutral-600 hover:bg-neutral-200'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Category Multi-Select Pills */}
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {EXPENSE_CATEGORIES.map(cat => {
                                            const isActive = filterCategories.includes(cat.value);
                                            return (
                                                <button
                                                    key={cat.value}
                                                    onClick={() => {
                                                        setFilterCategories(prev =>
                                                            isActive ? prev.filter(c => c !== cat.value) : [...prev, cat.value]
                                                        );
                                                    }}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap
                                                        ${isActive ? `${cat.bg} ${cat.color} ring-1 ring-current` : 'bg-white dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200'}`}
                                                >
                                                    <cat.icon size={14} />
                                                    {cat.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ===== SUMMARY INDICATORS ===== */}
                            {filteredExpenses.length > 0 && (
                                <>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                        <div className="bg-white dark:bg-neutral-800 p-3 rounded-2xl">
                                            <p className="text-xs text-neutral-500 font-medium">Total</p>
                                            <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{summaryStats.total.toFixed(0)}&#8239;&#8364;</p>
                                            <p className="text-xs text-neutral-400">{summaryStats.count} dépense{summaryStats.count > 1 ? 's' : ''}</p>
                                        </div>
                                        <div className="bg-white dark:bg-neutral-800 p-3 rounded-2xl">
                                            <p className="text-xs text-green-600 font-medium">Récupérable</p>
                                            <p className="text-lg font-semibold text-green-700">{summaryStats.recoverable.toFixed(0)}&#8239;&#8364;</p>
                                            <p className="text-xs text-neutral-400">{summaryStats.recoverablePercent}% du total</p>
                                        </div>
                                        <div className="bg-white dark:bg-neutral-800 p-3 rounded-2xl">
                                            <p className="text-xs text-red-500 font-medium">Non récup.</p>
                                            <p className="text-lg font-semibold text-red-600">{summaryStats.nonRecoverable.toFixed(0)}&#8239;&#8364;</p>
                                            <p className="text-xs text-neutral-400">{100 - summaryStats.recoverablePercent}% du total</p>
                                        </div>
                                        <div className="bg-white dark:bg-neutral-800 p-3 rounded-2xl">
                                            <p className="text-xs text-purple-600 font-medium">Déductible</p>
                                            <p className="text-lg font-semibold text-purple-700">{summaryStats.deductible.toFixed(0)}&#8239;&#8364;</p>
                                            <p className="text-xs text-neutral-400">{summaryStats.total > 0 ? Math.round((summaryStats.deductible / summaryStats.total) * 100) : 0}% du total</p>
                                        </div>
                                    </div>
                                    {summaryStats.total > 0 && (
                                        <div className="h-2 w-full rounded-full flex overflow-hidden mb-6">
                                            <div
                                                className="h-full bg-green-500 transition-all duration-300"
                                                style={{ width: `${summaryStats.recoverablePercent}%` }}
                                            />
                                            <div
                                                className="h-full bg-red-400 transition-all duration-300"
                                                style={{ width: `${100 - summaryStats.recoverablePercent}%` }}
                                            />
                                        </div>
                                    )}
                                </>
                            )}

                            {/* ===== EXPENSE LIST ===== */}
                            {property.expenses.length === 0 ? (
                                <div className="p-10 flex flex-col items-center justify-center text-center border-dashed border-2 border-neutral-200 rounded-xl">
                                    <div className="p-4 bg-neutral-100 rounded-full mb-4">
                                        <Receipt size={32} className="text-neutral-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-neutral-900">Aucune dépense</h3>
                                    <p className="text-neutral-500 max-w-sm mt-2 mb-6">Ajoutez vos factures pour suivre la rentabilité et préparer les régularisations.</p>
                                    <Button label="Ajouter ma première dépense" onClick={() => setIsOpen(true)} variant="outline" />
                                </div>
                            ) : filteredExpenses.length === 0 ? (
                                <div className="p-8 flex flex-col items-center justify-center text-center border-dashed border-2 border-neutral-200 rounded-xl">
                                    <p className="text-neutral-500 mb-4">Aucune dépense ne correspond à ces filtres</p>
                                    <button
                                        onClick={resetFilters}
                                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition"
                                    >
                                        <RotateCcw size={14} />
                                        Réinitialiser les filtres
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {filteredExpenses.map((expense) => {
                                        const expCat = EXPENSE_CATEGORIES.find(c => c.value === expense.category);
                                        const CategoryIcon = expCat?.icon || HelpCircle;
                                        return (
                                            <div key={expense.id} className="py-0 flex flex-col gap-2">
                                                {/* Date Line */}
                                                <div className="text-xs text-neutral-500 font-medium px-1 uppercase tracking-wider">
                                                    {format(new Date(expense.dateOccurred), 'dd MMM yyyy', { locale: fr })}
                                                </div>

                                                <SwipeableExpenseItem
                                                    onDelete={() => handleDelete(expense.id)}
                                                    onAddProof={() => {
                                                        setProofUrl(expense.proofUrl || '');
                                                        setStep(STEPS.PROOF);
                                                        setIsOpen(true);
                                                    }}
                                                    onEdit={() => handleEdit(expense)}
                                                    disabled={expense.isFinalized}
                                                >
                                                    <div className={`p-3 flex items-center justify-between ${expense.isFinalized ? 'opacity-75' : ''}`}>
                                                        <div className="flex items-center gap-3 flex-1 min-w-0 pl-0">
                                                            {/* Icon Box */}
                                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${expCat?.bg || 'bg-neutral-100'}`}>
                                                                <CategoryIcon size={20} className={expCat?.color || 'text-neutral-700'} />
                                                            </div>

                                                            {/* Text Info */}
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-normal text-neutral-900 truncate text-base flex items-center gap-2">
                                                                    {expense.label}
                                                                    {expense.isFinalized && (
                                                                        <div className="bg-neutral-100 p-1 rounded-md" title="Dépense régularisée (Modifications verrouillées)">
                                                                            <Shield size={12} className="text-neutral-500" />
                                                                        </div>
                                                                    )}
                                                                </span>
                                                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                                                    {expense.isRecoverable && (expense.amountRecoverableCents || 0) > 0 && (
                                                                        <div className="text-xs text-green-600 font-base bg-green-50 px-1.5 py-0.5 rounded-md">
                                                                            {((expense.amountRecoverableCents || 0) / 100).toFixed(0)}&#8364; récup.
                                                                        </div>
                                                                    )}
                                                                    {(expense.amountDeductibleCents || 0) > 0 && (
                                                                        <div className="text-xs text-purple-600 font-base bg-purple-50 px-1.5 py-0.5 rounded-md">
                                                                            {((expense.amountDeductibleCents || 0) / 100).toFixed(0)}&#8364; déduct.
                                                                        </div>
                                                                    )}
                                                                    {(!expense.isRecoverable || (expense.amountRecoverableCents || 0) <= 0) && (expense.amountDeductibleCents || 0) === 0 && (
                                                                        <div className="text-xs text-neutral-400">
                                                                            Non récupérable
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Right Side: Amount Only (Delete is Swipe) */}
                                                        <div className="flex items-center gap-3 pl-2">
                                                            <div className="flex flex-col items-end">
                                                                <span className="font-medium text-neutral-900 whitespace-nowrap text-base">
                                                                    {(expense.amountTotalCents / 100).toFixed(2)}&#8364;
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </SwipeableExpenseItem>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                            }

                        </PageBody>
                    </div>
                </div>
            </div >

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
            {/* Floating Action Button (FAB) for Add Expense */}
            <div className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-50">
                <DarkActionButton
                    onClick={() => setIsOpen(true)}
                    icon={Plus}
                >
                    Ajouter une dépense
                </DarkActionButton>
            </div>
        </Container >
    );
};

export default ExpensesClient;
