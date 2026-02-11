'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Modal from "@/components/modals/Modal";
import Heading from "@/components/Heading";
import SoftInput from "@/components/inputs/SoftInput";
import { reviseRent } from "@/app/actions/reviseRent";
import { calculateRevision } from "@/app/actions/calculateRevision";
import { Sparkles, Loader2, CheckCircle } from "lucide-react";
import { useTranslations, useLocale } from 'next-intl';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

interface RentRevisionModalProps {
    isOpen: boolean;
    onClose: () => void;
    applicationId: string;
    currentRent: number;
    currentCharges: number;
    leaseStartDate: Date;
    financials?: any[];
}

const RentRevisionModal: React.FC<RentRevisionModalProps> = ({
    isOpen,
    onClose,
    applicationId,
    currentRent,
    currentCharges,
    leaseStartDate,
    financials = []
}) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [newRent, setNewRent] = useState(currentRent);
    const [newCharges, setNewCharges] = useState(currentCharges);
    const t = useTranslations('rentModal.rentRevision');
    const locale = useLocale();
    const dateLocale = locale === 'fr' ? fr : enUS;

    // Calculate Next Anniversary
    const getNextAnniversary = (startDate: Date) => {
        const today = new Date();
        const currentYear = today.getFullYear();
        // Anniversary this year
        const anniversaryThisYear = new Date(startDate);
        anniversaryThisYear.setFullYear(currentYear);

        // If anniversary this year has passed, next one is next year
        if (anniversaryThisYear < today) {
            anniversaryThisYear.setFullYear(currentYear + 1);
        }
        return anniversaryThisYear;
    };

    const nextAnniversary = getNextAnniversary(new Date(leaseStartDate));
    const formattedAnniversary = nextAnniversary.toISOString().split('T')[0];

    const [effectiveDate, setEffectiveDate] = useState(formattedAnniversary);

    const [autoData, setAutoData] = useState<any>(null);

    // Detect if revision already exists for this effective date
    const existingRevision = financials.find((f: any) => {
        const d = new Date(f.startDate);
        return d.toISOString().split('T')[0] === effectiveDate;
    });

    useEffect(() => {
        if (isOpen && leaseStartDate) {
            calculateRevision(currentRent, leaseStartDate, effectiveDate)
                .then((res) => {
                    if (res.success) setAutoData(res.data);
                });
        }
    }, [isOpen, leaseStartDate, currentRent, effectiveDate]);

    const applyAutoRent = () => {
        if (autoData) {
            setNewRent(autoData.maxRent);
        }
    };

    const onSubmit = async () => {
        setIsLoading(true);

        const result = await reviseRent(
            applicationId,
            newRent,
            newCharges,
            new Date(effectiveDate)
        );

        if (result.success) {
            toast.success(t('success'));
            router.refresh();
            onClose();
        } else {
            toast.error(result.error || t('error'));
        }

        setIsLoading(false);
    };

    const bodyContent = (
        <div className="flex flex-col gap-4">
            <Heading
                title={t('title')}
                subtitle={t('subtitle')}
            />

            {autoData && (
                <div className="bg-white border border-neutral-200 rounded-2xl p-4 mb-2">
                    <div className="flex items-center gap-2 mb-4 text-indigo-600 font-semibold text-lg">
                        <Sparkles size={16} />
                        <span>{t('autoTitle')}</span>
                    </div>
                    <div className="flex flex-col gap-3 mb-4">
                        <div>
                            <div className="text-xs text-indigo-600 mb-1 uppercase tracking-wide font-medium">{t('currentRentHC')}</div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-base text-neutral-500">{t('currentRentHC')}</span>
                                <span className="font-medium text-neutral-800">{currentRent} €</span>
                            </div>
                        </div>

                        <div>
                            <div className="text-xs text-indigo-600 mb-1 uppercase tracking-wide font-medium">{t('referenceIndex')}</div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-base text-neutral-500">{autoData.baseIndex.quarter}</span>
                                <span className="font-medium text-neutral-800">{autoData.baseIndex.value}</span>
                            </div>
                        </div>

                        <div>
                            <div className="text-xs text-indigo-600 mb-1 uppercase tracking-wide font-medium">{t('newIndex')}</div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-base text-neutral-500">{autoData.newIndex.quarter}</span>
                                <span className="font-medium text-neutral-800">{autoData.newIndex.value}</span>
                            </div>
                        </div>
                        <hr className="border-neutral-200 my-1" />
                        <div>
                            <div className="text-sm text-indigo-600 mb-0 uppercase tracking-wide font-medium">{t('newLegalRent')}</div>
                            <div className="flex justify-between items-center text-base">
                                <span className="font-base text-neutral-500">{t('legalRentHC')}</span>
                                <span className="font-medium text-indigo-600 text-lg">{autoData.maxRent} €</span>
                            </div>
                        </div>
                    </div>


                    {existingRevision ? (
                        <div className=" text-emerald-800 p-4 rounded-xl text-center mb-2">
                            <div className="flex justify-center mb-2">
                                <CheckCircle size={24} />
                            </div>
                            <p className="font-semibold text-lg">{t('alreadyRevised.title')}</p>
                            <p className="text-sm opacity-90 mt-1">
                                {t('alreadyRevised.description', { amount: existingRevision.baseRentCents / 100 })}
                            </p>
                        </div>
                    ) : (
                        <button
                            onClick={applyAutoRent}
                            type="button"
                            className="w-full text-base font-medium bg-blue-600 text-white p-3 rounded-full hover:opacity-80 transition shadow-lg"
                        >
                            {t('applyAuto')}
                        </button>
                    )}
                </div>
            )}

            <div className={`grid grid-cols-2 gap-4 ${existingRevision ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-500 uppercase">{t('effectiveDate')}</label>
                    <input
                        disabled
                        type="date"
                        value={effectiveDate}
                        className="w-full p-3 bg-neutral-100 border-none rounded-lg text-neutral-500 cursor-not-allowed font-medium"
                    />
                </div>
                <div className="space-y-1">
                    {/* Placeholder for alignment */}
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-500 uppercase">{t('newRentHC')}</label>
                    <div className="relative">
                        <input
                            disabled
                            type="number"
                            value={newRent}
                            // onChange={(e) => setNewRent(parseFloat(e.target.value))} // Disabled manual edit
                            className="w-full p-3 border border-neutral-200 rounded-lg bg-neutral-100 text-neutral-500 cursor-not-allowed font-semibold"
                        />
                        <span className="absolute right-3 top-3 text-neutral-400">€</span>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-500 uppercase">{t('newCharges')}</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={newCharges}
                            onChange={(e) => setNewCharges(parseFloat(e.target.value))}
                            className="w-full p-3 border border-neutral-200 rounded-lg hover:border-black focus:border-black transition font-medium"
                        />
                        <span className="absolute right-3 top-3 text-neutral-400">€</span>
                    </div>
                </div>
            </div>
            <div className="text-sm text-neutral-500 bg-neutral-100 p-3 rounded-md">
                {t('info')}
            </div>
        </div >
    );

    const footerContent = (
        <div className="flex flex-row items-center gap-4 w-full">
            {!existingRevision && (
                <>
                    <button
                        className="
                        flex-1
                        border
                        border-neutral-300
                        rounded-full
                        py-3
                        text-sm
                        font-semibold
                        hover:opacity-80
                        transition
                    "
                        onClick={onClose}
                    >
                        {t('actions.cancel')}
                    </button>
                    <button
                        disabled={isLoading}
                        onClick={onSubmit}
                        className="
                        flex-1
                        bg-black
                        text-white
                        rounded-full
                        py-3
                        text-sm
                        font-semibold
                        hover:opacity-80
                        transition
                        flex justify-center items-center
                    "
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={18} /> : t('actions.confirm')}
                    </button>
                </>
            )}
            {existingRevision && (
                <button
                    className="
                     w-full
                     bg-neutral-100
                     text-neutral-500
                     rounded-full
                     py-3
                     text-sm
                     font-semibold
                     hover:opacity-80
                     transition
                 "
                    onClick={onClose}
                >
                    {t('actions.close')}
                </button>
            )}
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={onSubmit} // onSubmit is still passed, but the button is conditional
            title={t('title')}
            body={bodyContent}
            footer={footerContent} // Replaced actionLabel, secondaryAction, secondaryActionLabel
        />
    );
};

export default RentRevisionModal;
