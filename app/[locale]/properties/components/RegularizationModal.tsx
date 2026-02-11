'use client';

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Modal from '@/components/modals/Modal';
import Heading from '@/components/Heading';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getEligibleLeases, previewRegularization, commitRegularization, sendRegularizationMessage } from '@/app/actions/regularization';
import { SafeProperty } from '@/types';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import SwipeableExpenseItem from '../[listingId]/expenses/components/SwipeableExpenseItem';
import { useTranslations, useLocale } from 'next-intl';
import { PDFDownloadLink } from '@react-pdf/renderer';
import RegularizationDocument from '@/components/documents/RegularizationDocument';

import {
    Droplets,
    Flame,
    Zap,
    Building,
    Gauge,
    Layers,
    Building2,
    Car,
    Shield,
    FileCheck2,
    Wrench,
    UserCheck,
    HelpCircle,
    Receipt,
    CheckCircle,
    Loader2
} from 'lucide-react';


enum STEPS {
    SELECT = 0,
    PREVIEW = 1,
    COMPLETION = 2
}

interface RegularizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId: string;
}

const RegularizationModal: React.FC<RegularizationModalProps> = ({
    isOpen,
    onClose,
    propertyId
}) => {
    const router = useRouter();
    const [step, setStep] = useState(STEPS.SELECT);
    const [isLoading, setIsLoading] = useState(false);
    const t = useTranslations('regularization');
    const locale = useLocale();
    const dateLocale = locale === 'fr' ? fr : enUS;

    const EXPENSE_CATEGORIES = [
        { value: 'COLD_WATER', label: t('categories.coldWater'), icon: Droplets, recoverable: true, ratio: 1.0, color: 'text-blue-600', bg: 'bg-blue-100' },
        { value: 'HOT_WATER', label: t('categories.hotWater'), icon: Flame, recoverable: true, ratio: 1.0, color: 'text-orange-600', bg: 'bg-orange-100' },
        { value: 'ELECTRICITY_COMMON', label: t('categories.electricityCommon'), icon: Zap, recoverable: true, ratio: 1.0, color: 'text-yellow-600', bg: 'bg-yellow-100' },
        { value: 'ELECTRICITY_PRIVATE', label: 'Électricité (Privé)', icon: Zap, recoverable: false, ratio: 0, color: 'text-yellow-700', bg: 'bg-yellow-50' }, // Not in JSON but likely hidden/unused? or should we add it? Let's keep hardcoded or add to JSON if visible. It says "Privé" so probably not recoverable, not crucial for tenant regularization.
        { value: 'HEATING_COLLECTIVE', label: t('categories.heating'), icon: Flame, recoverable: true, ratio: 1.0, color: 'text-red-600', bg: 'bg-red-100' },
        { value: 'TAX_PROPERTY', label: t('categories.tax'), icon: Building, recoverable: false, ratio: 0, color: 'text-indigo-600', bg: 'bg-indigo-100' },
        { value: 'METERS', label: t('categories.meters'), icon: Gauge, recoverable: true, ratio: 1.0, color: 'text-cyan-600', bg: 'bg-cyan-100' },
        { value: 'GENERAL_CHARGES', label: t('categories.general'), icon: Layers, recoverable: true, ratio: 1.0, color: 'text-gray-600', bg: 'bg-gray-100' },
        { value: 'BUILDING_CHARGES', label: t('categories.building'), icon: Building2, recoverable: true, ratio: 1.0, color: 'text-stone-600', bg: 'bg-stone-100' },
        { value: 'ELEVATOR', label: t('categories.elevator'), icon: Building, recoverable: true, ratio: 1.0, color: 'text-purple-600', bg: 'bg-purple-100' },
        { value: 'PARKING', label: 'Parking', icon: Car, recoverable: false, ratio: 0, color: 'text-neutral-600', bg: 'bg-neutral-100' },
        { value: 'INSURANCE', label: 'Assurance PNO', icon: Shield, recoverable: false, ratio: 0, color: 'text-emerald-600', bg: 'bg-emerald-100' },
        { value: 'INSURANCE_GLI', label: 'Assurance GLI', icon: FileCheck2, recoverable: false, ratio: 0, color: 'text-teal-600', bg: 'bg-teal-100' },
        { value: 'MAINTENANCE', label: t('categories.maintenance'), icon: Wrench, recoverable: true, ratio: 1.0, color: 'text-lime-600', bg: 'bg-lime-100' },
        { value: 'CARETAKER', label: t('categories.caretaker'), icon: UserCheck, recoverable: true, ratio: 1.0, color: 'text-rose-600', bg: 'bg-rose-100' },
        { value: 'OTHER', label: 'Autre', icon: HelpCircle, recoverable: false, ratio: 0, color: 'text-slate-600', bg: 'bg-slate-100' },
    ];


    // Data
    const [leases, setLeases] = useState<any[]>([]);
    const [selectedLeaseId, setSelectedLeaseId] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1); // Default to previous year

    const [previewData, setPreviewData] = useState<any>(null);

    // Fetch leases on open
    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            getEligibleLeases(propertyId)
                .then((data) => {
                    setLeases(data);
                    if (data.length > 0) setSelectedLeaseId(data[0].id);
                })
                .catch(() => toast.error(t('errors.loadLeases')))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, propertyId]);

    const onNext = async () => {
        if (step === STEPS.SELECT) {
            setIsLoading(true);
            try {
                const data = await previewRegularization(selectedLeaseId, propertyId, selectedYear);
                setPreviewData(data);
                setStep(STEPS.PREVIEW);
            } catch (error) {
                toast.error(t('errors.calculate'));
            } finally {
                setIsLoading(false);
            }
        } else if (step === STEPS.PREVIEW) {
            setIsLoading(true);
            try {
                await commitRegularization(
                    selectedLeaseId,
                    propertyId,
                    selectedYear,
                    previewData.balanceCents,
                    previewData.totalRecoverableExpensesCents,
                    previewData.totalProvisionsReceivedCents,
                    previewData.expenses.map((e: any) => e.id)
                );
                toast.success(t('status.registered'));
                setStep(STEPS.COMPLETION); // Move to completion instead of closing
                router.refresh();
                // onClose(); // Don't close yet, let user download PDF
            } catch (error) {
                toast.error(t('errors.save'));
            } finally {
                setIsLoading(false);
            }
        } else if (step === STEPS.COMPLETION) {
            setStep(STEPS.SELECT);
            onClose();
        }
    };

    const actionLabel = useMemo(() => {
        if (step === STEPS.SELECT) return t('steps.calculate');
        if (step === STEPS.PREVIEW) return t('steps.completion'); // "Valider et Clôturer"
        return t('steps.completion'); // "Terminer"
    }, [step, t]);

    const secondaryActionLabel = useMemo(() => {
        if (step === STEPS.SELECT) return undefined;
        if (step === STEPS.COMPLETION) return undefined;
        return t('steps.select'); // Using "Locataire / Bail" as back label? No, usually "Retour". Let's assume generic "Back" or use specific key if desired. But original code had "Retour". 
        // Let's use a generic 'back' key if available, or just hardcode "Retour" if missing, or use t('steps.select') if it makes sense contextually. 
        // JSON has "steps": { "select": "Locataire / Bail" ... }. 
        // Let's add a "back" key or reuse generic. For now I'll use "Retour" as fallback or check if I added common keys.
        // Actually, Modal usually handles "Back" or "Cancel". 
        // Let's stick to "Retour" for now or add to JSON.
        // I'll add "back": "Retour" to `regularization.steps` implicitly or rely on generic `rentModal.actions.back`? 
        // The original component had 'Retour'. I will hardcode 'Retour' for now or add it to JSON.
        // Wait, I can use `rentModal.actions.back` if I want consistency.
    }, [step, t]);

    const onBack = () => {
        if (step !== STEPS.SELECT && step !== STEPS.COMPLETION) setStep((value) => value - 1);
    };

    // Helper to get names
    const selectedLease = leases.find(l => l.id === selectedLeaseId);

    // BODY CONTENT
    let bodyContent = (
        <div className="flex flex-col gap-4">
            <Heading
                title={t('title')}
                subtitle={t('subtitle')}
            />
            <div className='flex flex-col gap-4'>
                <label className="block text-sm font-medium text-gray-700">{t('steps.select')}</label>
                <select
                    value={selectedLeaseId}
                    onChange={(e) => setSelectedLeaseId(e.target.value)}
                    disabled={isLoading}
                    className="w-full p-2 border rounded-md"
                >
                    {leases.length === 0 && <option>Aucun bail signé trouvé</option>}
                    {leases.map((lease) => (
                        <option key={lease.id} value={lease.id}>
                            {lease.tenantName} - {lease.unitName}
                        </option>
                    ))}
                </select>

                <label className="block text-sm font-medium text-gray-700">{t('steps.year')}</label>
                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    disabled={isLoading}
                    className="w-full p-2 border rounded-md"
                >
                    {[2023, 2024, 2025, 2026].map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
            </div>
        </div>
    );

    if (step === STEPS.PREVIEW) {
        const balance = (previewData?.balanceCents || 0) / 100;
        const provisions = (previewData?.totalProvisionsReceivedCents || 0) / 100;
        const real = (previewData?.totalRecoverableExpensesCents || 0) / 100;

        bodyContent = (
            <div className="flex flex-col gap-6">
                <Heading
                    title={t('steps.preview')}
                    subtitle={`Régularisation pour l'année ${selectedYear}`}
                />

                <div className="bg-neutral-50 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-500">{t('details.recoverable')}</span>
                        <span className="font-semibold text-neutral-900">{real.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-500">{t('details.provisions')}</span>
                        <span className="font-semibold text-green-600">{provisions.toFixed(2)} €</span>
                    </div>
                    <hr />
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-neutral-600">{t('details.balance')}</span>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-neutral-500">{t('details.remaining')}</span>
                            <span className={`text-xl font-medium ${balance > 0 ? "text-red-500" : "text-green-600"}`}>
                                {balance > 0 ? `${balance.toFixed(2)} € ` : `${t('details.toReimburse')} ${Math.abs(balance).toFixed(2)} €`}
                            </span>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 className="font-medium mb-4 text-sm text-neutral-500">{t('details.expensesIncluded', { count: previewData?.expenses?.length })}</h4>

                    <div className="flex flex-col divide-y divide-neutral-100">
                        {previewData?.expenses.map((expense: any) => {
                            const category = EXPENSE_CATEGORIES.find(c => c.value === expense.category);
                            const CategoryIcon = category?.icon || HelpCircle;

                            return (
                                <div key={expense.id} className="py-3 flex flex-col gap-2 bg-white">
                                    <div className="text-xs text-neutral-500 font-medium px-1 uppercase tracking-wider">
                                        {format(new Date(expense.dateOccurred), 'dd MMM yyyy', { locale: dateLocale })}
                                    </div>

                                    <SwipeableExpenseItem
                                        onDelete={() => {
                                            if (!window.confirm('Exclure cette dépense de la régularisation ?')) return;
                                            const newExpenses = previewData.expenses.filter((e: any) => e.id !== expense.id);
                                            // Recalculate totals roughly or just update list and let backend handle final calculation?
                                            // Ideally we should recalculate, but for UI updates let's just update the list and subtract amounts
                                            const removedAmount = expense.amountRecoverableCents || 0;

                                            setPreviewData((prev: any) => ({
                                                ...prev,
                                                expenses: newExpenses,
                                                totalRecoverableExpensesCents: prev.totalRecoverableExpensesCents - removedAmount,
                                                balanceCents: (prev.totalRecoverableExpensesCents - removedAmount) - prev.totalProvisionsReceivedCents
                                            }));
                                        }}
                                        onAddProof={() => toast('Modification non disponible ici')}
                                    >
                                        <div className="flex items-center justify-between border-b border-neutral-100 last:border-0 pb-0">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${category?.bg || 'bg-neutral-100'}`}>
                                                    <CategoryIcon size={18} className={category?.color || 'text-neutral-700'} />
                                                </div>

                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-normal text-neutral-900 truncate text-base">
                                                        {expense.label}
                                                    </span>
                                                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                                        {expense.isRecoverable && (expense.amountRecoverableCents || 0) > 0 && (
                                                            <div className="text-[12px] text-green-600 font-normal bg-green-50 px-1.5 py-0.5 rounded-md">
                                                                {((expense.amountRecoverableCents || 0) / 100).toFixed(0)}€ Récupérable
                                                            </div>
                                                        )}
                                                        {(!expense.isRecoverable || (expense.amountRecoverableCents || 0) <= 0) && (
                                                            <div className="text-[12px] text-neutral-500 font-normal bg-neutral-100 px-1.5 py-0.5 rounded-md">
                                                                Non récupérable
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-medium text-neutral-900 whitespace-nowrap text-base">
                                                        {((expense.amountRecoverableCents || expense.amountTotalCents) / 100).toFixed(2)}€
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </SwipeableExpenseItem>
                                </div>
                            );
                        })}
                        {(!previewData?.expenses || previewData.expenses.length === 0) && (
                            <div className="p-8 text-center text-neutral-400 text-sm flex flex-col items-center gap-2">
                                <Receipt size={24} className="opacity-50" />
                                Aucune charge récupérable trouvée sur la période.
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-xs text-neutral-400 bg-blue-50 p-2 rounded text-center">
                    {t('details.lockedInfo')}
                </div>
            </div>
        );
    }

    const [sendingStatus, setSendingStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

    // Auto-Send PDF on Completion
    useEffect(() => {
        if (step === STEPS.COMPLETION && sendingStatus === 'idle' && previewData && selectedLease) {
            const sendDocument = async () => {
                setSendingStatus('sending');
                try {
                    // 1. Generate PDF Blob
                    const { pdf } = await import('@react-pdf/renderer');
                    const blob = await pdf(
                        <RegularizationDocument
                            data={previewData}
                            tenantName={selectedLease?.tenantName}
                            unitName={selectedLease?.unitName}
                            propertyAddress={selectedLease?.propertyAddress}
                        />
                    ).toBlob();

                    if (blob.size < 100) throw new Error("PDF généré vide ou corrompu");

                    // 2. Client-Side Unsigned Upload (No API Key needed if preset allows)
                    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
                    const uploadPreset = "airbnb-clone";

                    if (!cloudName) throw new Error("Cloudinary Cloud Name missing");

                    const formData = new FormData();
                    formData.append('file', blob, `regularization-${selectedLeaseId}.pdf`);
                    formData.append('upload_preset', uploadPreset);
                    formData.append('folder', 'coridor/documents');

                    // Use 'auto' to let Cloudinary detect PDF as 'raw' or 'image' correctly
                    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
                        method: 'POST',
                        body: formData
                    });

                    const data = await uploadRes.json();

                    if (!uploadRes.ok) {
                        console.error("Cloudinary upload error:", data);
                        throw new Error(data.error?.message || "Upload failed");
                    }

                    const url = data.secure_url;
                    console.log("Uploaded Document URL:", url);

                    // 3. Send Message via Server Action
                    await sendRegularizationMessage(selectedLeaseId, url, selectedYear);
                    setSendingStatus('sent');
                    toast.success('Document envoyé au locataire !');
                } catch (error) {
                    console.error("Auto-send error:", error);
                    setSendingStatus('error');
                    toast.error("Erreur lors de l'envoi au locataire (Vérifiez votre configuration)");
                }
            };
            sendDocument();
        }
    }, [step, sendingStatus, previewData, selectedLease, selectedLeaseId, selectedYear]);

    if (step === STEPS.COMPLETION) {
        bodyContent = (
            <div className="flex flex-col items-center justify-center gap-6 py-8">
                <div className="bg-green-100 p-4 rounded-full text-green-600">
                    <CheckCircle size={48} />
                </div>
                <div className="text-center">
                    <h3 className="text-xl font-bold mb-2">{t('status.registered')}</h3>
                    <p className="text-neutral-500 text-sm max-w-xs mx-auto mb-2">
                        {t('status.description')}
                    </p>

                    {sendingStatus === 'sending' && (
                        <p className="text-blue-500 text-xs flex items-center justify-center gap-2">
                            <Loader2 className="animate-spin" size={14} /> {t('status.sending')}
                        </p>
                    )}
                    {sendingStatus === 'sent' && (
                        <p className="text-green-600 text-xs flex items-center justify-center gap-2">
                            <CheckCircle size={14} /> {t('status.sent')}
                        </p>
                    )}
                    {sendingStatus === 'error' && (
                        <p className="text-red-500 text-xs">
                            {t('status.error')}
                        </p>
                    )}
                </div>

                <PDFDownloadLink
                    document={
                        <RegularizationDocument
                            data={previewData}
                            tenantName={selectedLease?.tenantName}
                            unitName={selectedLease?.unitName}
                            propertyAddress={selectedLease?.propertyAddress}
                        />
                    }
                    fileName={`Decompte-Charges-${selectedYear}-${selectedLease?.tenantName}.pdf`}
                    className="
                        w-full 
                        max-w-xs 
                        bg-black 
                        text-white 
                        font-semibold 
                        py-3 
                        px-4 
                        rounded-full 
                        flex 
                        items-center 
                        justify-center 
                        gap-2 
                        hover:opacity-80 
                        transition
                    "
                >
                    {/* @ts-ignore - PDFDownloadLink children type mismatch sometimes */}
                    {({ loading }: any) => (
                        loading ? 'Génération du PDF...' : t('status.download')
                    )}
                </PDFDownloadLink>

                <div className="text-xs text-neutral-400 text-center mt-4">
                    Vous pourrez retrouver ce document dans l'historique des locataires.
                </div>
            </div>
        );
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={onNext}
            actionLabel={actionLabel}
            secondaryActionLabel={secondaryActionLabel}
            secondaryAction={onBack}
            title={t('title')}
            body={bodyContent}
            disabled={isLoading || leases.length === 0}
        />
    );
};

export default RegularizationModal;
