'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import {
    getEligibleLeases,
    previewRegularization,
    commitRegularization,
    sendRegularizationMessage,
    updateRegularizationReportUrl,
} from '@/app/actions/regularization';
import RegularizationDocument from '@/components/documents/RegularizationDocument';

import WelcomeStep from '@/components/regularization/WelcomeStep';
import GuideSlides from '@/components/regularization/GuideSlides';
import SelectStep from '@/components/regularization/SelectStep';
import BalanceStep from '@/components/regularization/BalanceStep';
import ExpenseReviewStep from '@/components/regularization/ExpenseReviewStep';
import SendStep from '@/components/regularization/SendStep';
import DoneStep from '@/components/regularization/DoneStep';

import { useTranslations } from 'next-intl';

type Step = 'WELCOME' | 'GUIDE' | 'SELECT' | 'BALANCE' | 'EXPENSES' | 'SEND' | 'DONE';

interface RegularizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId?: string;
}

const RegularizationModal: React.FC<RegularizationModalProps> = ({
    isOpen,
    onClose,
    propertyId,
}) => {
    const router = useRouter();
    const t = useTranslations('regularization');

    // Step state
    const [step, setStep] = useState<Step>('WELCOME');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // Data
    const [leases, setLeases] = useState<any[]>([]);
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [selectedLeaseId, setSelectedLeaseId] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1);
    const [previewData, setPreviewData] = useState<any>(null);
    const [reconciliationId, setReconciliationId] = useState<string | null>(null);

    // After expense review, adjusted values
    const [finalExpenseIds, setFinalExpenseIds] = useState<string[]>([]);
    const [finalTotalCents, setFinalTotalCents] = useState(0);
    const [finalBalanceCents, setFinalBalanceCents] = useState(0);

    // Portal mount
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch leases on open
    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            getEligibleLeases(propertyId)
                .then((data) => {
                    const { leases: fetchedLeases, years } = data;
                    setLeases(fetchedLeases);
                    setAvailableYears(years);
                    if (fetchedLeases.length > 0 && !selectedLeaseId) {
                        setSelectedLeaseId(fetchedLeases[0].id);
                    }
                    const prevYear = new Date().getFullYear() - 1;
                    if (years.includes(prevYear)) {
                        setSelectedYear(prevYear);
                    } else if (years.length > 0) {
                        setSelectedYear(years[years.length - 1]);
                    }
                })
                .catch(() => toast.error(t('errors.loadLeases')))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, propertyId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setStep('WELCOME');
            setPreviewData(null);
            setReconciliationId(null);
            setFinalExpenseIds([]);
            setFinalTotalCents(0);
            setFinalBalanceCents(0);
            setIsSending(false);
        }
    }, [isOpen]);

    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Helpers
    const selectedLease = leases.find((l: any) => l.id === selectedLeaseId);

    // --- STEP HANDLERS ---

    const handleCalculate = async () => {
        if (!selectedLeaseId) return;
        setIsLoading(true);
        try {
            const leasePropertyId = selectedLease?.propertyId || propertyId || '';
            const data = await previewRegularization(selectedLeaseId, leasePropertyId, selectedYear);
            setPreviewData(data);
            setStep('BALANCE');
        } catch {
            toast.error(t('errors.calculate'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleExpenseReviewDone = (includedIds: string[], newTotalCents: number, newBalanceCents: number) => {
        setFinalExpenseIds(includedIds);
        setFinalTotalCents(newTotalCents);
        setFinalBalanceCents(newBalanceCents);
        setStep('SEND');
    };

    const handleSend = async () => {
        if (!selectedLease || !previewData) return;
        setIsSending(true);
        try {
            // 1. Commit regularization
            const commitPropertyId = selectedLease.propertyId || propertyId || '';
            const result = await commitRegularization(
                selectedLeaseId,
                commitPropertyId,
                selectedYear,
                finalBalanceCents,
                finalTotalCents,
                previewData.totalProvisionsReceivedCents,
                finalExpenseIds,
            );
            setReconciliationId(result.reconciliationId);

            // 2. Generate PDF blob
            const { pdf } = await import('@react-pdf/renderer');
            const filteredExpenses = previewData.expenses.filter((e: any) => finalExpenseIds.includes(e.id));
            const blob = await pdf(
                <RegularizationDocument
                    data={{
                        ...previewData,
                        totalRecoverableExpensesCents: finalTotalCents,
                        balanceCents: finalBalanceCents,
                        expenses: filteredExpenses,
                    }}
                    tenantName={selectedLease.tenantName}
                    unitName={selectedLease.unitName}
                    propertyAddress={selectedLease.propertyAddress}
                />
            ).toBlob();

            if (blob.size < 100) throw new Error('PDF vide ou corrompu');

            // 3. Upload to Cloudinary
            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
            const uploadPreset = 'airbnb-clone';
            if (!cloudName) throw new Error('Cloudinary Cloud Name missing');

            const formData = new FormData();
            formData.append('file', blob, `regularization-${selectedLeaseId}.pdf`);
            formData.append('upload_preset', uploadPreset);
            formData.append('folder', 'coridor/documents');

            const uploadRes = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
                { method: 'POST', body: formData }
            );
            const uploadData = await uploadRes.json();
            if (!uploadRes.ok) throw new Error(uploadData.error?.message || 'Upload failed');

            const documentUrl = uploadData.secure_url;

            // 4. Store reportUrl on ReconciliationHistory
            if (result.reconciliationId) {
                await updateRegularizationReportUrl(result.reconciliationId, documentUrl);
            }

            // 5. Send message + push + email + notification via server action
            await sendRegularizationMessage(selectedLeaseId, documentUrl, selectedYear);

            setStep('DONE');
            router.refresh();
        } catch (error) {
            console.error('Regularization send error:', error);
            toast.error(t('errors.save'));
        } finally {
            setIsSending(false);
        }
    };

    const handleClose = () => {
        onClose();
    };

    if (!isOpen || !mounted) return null;

    // --- STEP PROGRESS (WELCOME/GUIDE are pre-flow, don't show progress) ---
    const STEP_ORDER: Step[] = ['SELECT', 'BALANCE', 'EXPENSES', 'SEND', 'DONE'];
    const progressIndex = STEP_ORDER.indexOf(step);
    const showProgress = progressIndex >= 0;

    return createPortal(
        <div className="fixed inset-0 z-10001 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={handleClose}
            />

            {/* Modal container */}
            <div className="
                relative z-10
                bg-white dark:bg-neutral-900
                w-full h-full
                md:h-auto md:max-h-[90vh] md:max-w-lg md:rounded-2xl
                flex flex-col
                overflow-hidden
            ">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-2 shrink-0">
                    {/* Progress bar */}
                    {showProgress ? (
                        <div className="flex items-center gap-1.5 flex-1 mr-4">
                            {STEP_ORDER.map((s, i) => (
                                <div
                                    key={s}
                                    className={`
                                        h-1 flex-1 rounded-full transition-colors duration-300
                                        ${i <= progressIndex
                                            ? 'bg-neutral-900 dark:bg-white'
                                            : 'bg-neutral-200 dark:bg-neutral-700'
                                        }
                                    `}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1" />
                    )}

                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        className="
                            w-8 h-8 rounded-full
                            flex items-center justify-center
                            hover:bg-neutral-100 dark:hover:bg-neutral-800
                            transition cursor-pointer shrink-0
                        "
                    >
                        <X size={18} className="text-neutral-500" />
                    </button>
                </div>

                {/* Content — scrollable within each step */}
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    {step === 'WELCOME' && (
                        <WelcomeStep
                            onStart={() => setStep('SELECT')}
                            onGuide={() => setStep('GUIDE')}
                        />
                    )}

                    {step === 'GUIDE' && (
                        <GuideSlides
                            onComplete={() => setStep('SELECT')}
                            onBack={() => setStep('WELCOME')}
                        />
                    )}

                    {step === 'SELECT' && (
                        <SelectStep
                            leases={leases}
                            availableYears={availableYears}
                            selectedLeaseId={selectedLeaseId}
                            selectedYear={selectedYear}
                            isLoading={isLoading}
                            onSelectLease={setSelectedLeaseId}
                            onSelectYear={setSelectedYear}
                            onCalculate={handleCalculate}
                            onBack={() => setStep('WELCOME')}
                        />
                    )}

                    {step === 'BALANCE' && previewData && (
                        <BalanceStep
                            previewData={previewData}
                            tenantName={selectedLease?.tenantName || 'Locataire'}
                            onContinue={() => setStep('EXPENSES')}
                            onBack={() => setStep('SELECT')}
                        />
                    )}

                    {step === 'EXPENSES' && previewData && (
                        <ExpenseReviewStep
                            expenses={previewData.expenses}
                            totalProvisionsCents={previewData.totalProvisionsReceivedCents}
                            onContinue={handleExpenseReviewDone}
                            onBack={() => setStep('BALANCE')}
                        />
                    )}

                    {step === 'SEND' && selectedLease && (
                        <SendStep
                            tenantName={selectedLease.tenantName}
                            propertyAddress={selectedLease.propertyAddress}
                            year={selectedYear}
                            totalChargesCents={finalTotalCents}
                            totalProvisionsCents={previewData?.totalProvisionsReceivedCents || 0}
                            balanceCents={finalBalanceCents}
                            isSending={isSending}
                            onSend={handleSend}
                            onBack={() => setStep('EXPENSES')}
                        />
                    )}

                    {step === 'DONE' && selectedLease && (
                        <DoneStep
                            previewData={{
                                ...previewData,
                                totalRecoverableExpensesCents: finalTotalCents,
                                balanceCents: finalBalanceCents,
                                expenses: previewData?.expenses?.filter((e: any) => finalExpenseIds.includes(e.id)) || [],
                            }}
                            tenantName={selectedLease.tenantName}
                            unitName={selectedLease.unitName}
                            propertyAddress={selectedLease.propertyAddress}
                            year={selectedYear}
                            leaseId={selectedLeaseId}
                            onClose={handleClose}
                        />
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default RegularizationModal;
