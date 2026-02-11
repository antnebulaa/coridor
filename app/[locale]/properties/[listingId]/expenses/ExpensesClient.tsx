'use client';

import { SafeUser, SafeProperty, SafeExpense, SafeRentalUnit } from "@/types";
import { useCallback, useMemo, useState } from "react";
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
    ArrowLeft
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
import SwipeableExpenseItem from "./components/SwipeableExpenseItem"; // Assuming this exists based on EditPropertyClient

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

const FREQUENCIES = [
    { value: 'ONCE', label: 'Ponctuel' },
    { value: 'MONTHLY', label: 'Mensuel' },
    { value: 'QUARTERLY', label: 'Trimestriel' },
    { value: 'YEARLY', label: 'Annuel' },
];

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
        }, 300);
    }

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
            return "Attention, cette charge n'est légalement pas récupérable sur le locataire.";
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

        axios.post(`/api/properties/${property.id}/expenses`, {
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
            propertyId: property.id,
            proofUrl
        })
            .then(() => {
                toast.success('Dépense ajoutée !');
                setIsOpen(false);
                router.refresh();
                setLabel('');
                setAmount('');
                setProofUrl('');
                setStep(STEPS.CATEGORY);
            })
            .catch(() => {
                toast.error('Erreur lors de l\'ajout');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [property.id, category, label, amount, date, frequency, isRecoverable, recoverableAmount, rentalUnitId, router]);

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
            return 'Ajouter';
        }
        return undefined;
    }, [step]);

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

    // ... Modal Body Content Construction (Same as before) ...
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
                <Heading title="Détails" subtitle="Complétez les informations" />

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

                    {/* Deductible Amount Input - Always visible or conditional? Usually always relevant for taxes. */}
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
                            disabled={isLoading}
                        />
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
                    <p>💡 Prenez en photo votre facture ou ticket de caisse. C'est utile pour les impôts et pour justifier les charges aux locataires.</p>
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
                            Modification d'annonce
                        </div>
                    </div>

                    <EditPropertySidebar
                        activeTab="location"
                        activeSection="expenses"
                        onChangeTab={onSidebarTabChange}
                        onChangeSection={onSidebarSectionChange}
                    // Reuse the same logic for titles if possible, or simplified for now since we are in a specific page
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



                            {/* Empty State */}
                            {property.expenses.length === 0 ? (
                                <div className="p-10 flex flex-col items-center justify-center text-center border-dashed border-2 border-neutral-200 rounded-xl">
                                    <div className="p-4 bg-neutral-100 rounded-full mb-4">
                                        <Receipt size={32} className="text-neutral-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-neutral-900">Aucune dépense</h3>
                                    <p className="text-neutral-500 max-w-sm mt-2 mb-6">Ajoutez vos factures pour suivre la rentabilité et préparer les régularisations.</p>
                                    <Button label="Ajouter ma première dépense" onClick={() => setIsOpen(true)} variant="outline" />
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {property.expenses.map((expense) => {
                                        const category = EXPENSE_CATEGORIES.find(c => c.value === expense.category);
                                        const CategoryIcon = category?.icon || HelpCircle;
                                        return (
                                            <div key={expense.id} className="py-0 flex flex-col gap-2">
                                                {/* Date Line - Fixed, doesn't slide */}
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
                                                    disabled={expense.isFinalized}
                                                >
                                                    <div className={`p-3 flex items-center justify-between ${expense.isFinalized ? 'opacity-75' : ''}`}>
                                                        <div className="flex items-center gap-3 flex-1 min-w-0 pl-0">
                                                            {/* Icon Box */}
                                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${category?.bg || 'bg-neutral-100'}`}>
                                                                <CategoryIcon size={20} className={category?.color || 'text-neutral-700'} />
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
                                                                            {((expense.amountRecoverableCents || 0) / 100).toFixed(0)}€ récup.
                                                                        </div>
                                                                    )}
                                                                    {(expense.amountDeductibleCents || 0) > 0 && (
                                                                        <div className="text-xs text-purple-600 font-base bg-purple-50 px-1.5 py-0.5 rounded-md">
                                                                            {((expense.amountDeductibleCents || 0) / 100).toFixed(0)}€ déduct.
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
                                                                    {(expense.amountTotalCents / 100).toFixed(2)}€
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
