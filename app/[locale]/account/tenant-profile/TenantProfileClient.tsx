'use client';

import axios from "axios";
import { useState, useEffect, useRef } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { SafeUser } from "@/types";
import { generateDossierHtml } from "@/utils/dossierGenerator";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { Info, ShieldCheck, CheckCircle, Eye, Sparkles, Lock, CreditCard, ArrowRight, Plus, Trash2, Download } from "lucide-react";
import Modal from "@/components/modals/Modal";

import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import SoftInput from "@/components/inputs/SoftInput";
import SoftSelect from "@/components/inputs/SoftSelect";
import { Button } from "@/components/ui/Button";
import SoftButton from "@/components/ui/SoftButton";
import SoftTextArea from "@/components/inputs/SoftTextArea";
import TenantProfilePreview from "@/components/profile/TenantProfilePreview";
import { useTranslations, useFormatter, useLocale } from 'next-intl';


interface TenantProfileClientProps {
    currentUser: SafeUser;
    tenantProfile: any;
}

const TenantProfileClient: React.FC<TenantProfileClientProps> = ({
    currentUser,
    tenantProfile
}) => {
    const router = useRouter();
    const params = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [isRentModalOpen, setIsRentModalOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [detectedTransactions, setDetectedTransactions] = useState<any[]>([]);
    const processingRef = useRef(false);

    const t = useTranslations('account.profile');
    const tEnums = useTranslations('account.enums');
    const tCommon = useTranslations('common');
    const format = useFormatter();
    const locale = useLocale();

    // Check for Powens callback
    useEffect(() => {
        const code = params?.get('code');
        if (code && !isRentModalOpen && !tenantProfile?.rentVerified) {
            handleAnalyzeRent(code);
        }
    }, [params, isRentModalOpen, tenantProfile?.rentVerified]);

    const handleAnalyzeRent = async (code: string) => {
        if (processingRef.current) return;
        processingRef.current = true;
        setIsLoading(true);

        try {
            const response = await axios.post('/api/powens/analyze', {
                code,
                locale
            });

            if (response.data.found) {
                setDetectedTransactions(response.data.transactions || []);
                setIsRentModalOpen(true);
                router.replace('/account/tenant-profile');
            } else {
                toast.error(t('rentVerification.toasts.noRent'));
                router.replace('/account/tenant-profile');
            }
        } catch (error) {
            console.error(error);
            toast.error(t('rentVerification.toasts.error'));
            router.replace('/account/tenant-profile');
        } finally {
            setIsLoading(false);
            processingRef.current = false;
        }
    };

    const handleConfirmRent = async () => {
        setIsLoading(true);
        try {
            await axios.post('/api/profile/verify-rent');
            toast.success(t('rentVerification.toasts.success'));
            setIsRentModalOpen(false);
            router.refresh();
        } catch (error) {
            toast.error(t('rentVerification.toasts.error'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetRent = async () => {
        if (!confirm(tCommon('confirm'))) return;

        setIsLoading(true);
        try {
            await axios.delete('/api/profile/verify-rent');
            toast.success(t('rentVerification.toasts.reset'));
            router.refresh();
        } catch (error) {
            toast.error(t('rentVerification.toasts.error'));
        } finally {
            setIsLoading(false);
        }
    };

    const defaultValues = {
        jobType: tenantProfile?.jobType || '',
        jobTitle: tenantProfile?.jobTitle || '',
        netSalary: tenantProfile?.netSalary || '',
        partnerJobType: tenantProfile?.partnerJobType || '',
        partnerJobTitle: tenantProfile?.partnerJobTitle || '',
        partnerNetSalary: tenantProfile?.partnerNetSalary || '',
        guarantors: tenantProfile?.guarantors || [],
        additionalIncomes: tenantProfile?.additionalIncomes || [],
        aplAmount: tenantProfile?.aplAmount || '',
        aplDirectPayment: tenantProfile?.aplDirectPayment || false,
        bio: tenantProfile?.bio || '',
        landlordName: tenantProfile?.landlordName || ''
    };

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: {
            errors,
        }
    } = useForm<FieldValues>({
        defaultValues
    });

    const guarantors = watch('guarantors');
    const additionalIncomes = watch('additionalIncomes');
    const netSalary = watch('netSalary');
    const partnerNetSalary = watch('partnerNetSalary');
    const aplAmount = watch('aplAmount');

    // Calculate totals
    const totalTenantIncome = (parseInt(netSalary || '0') || 0) + (parseInt(partnerNetSalary || '0') || 0);
    const totalAdditionalIncome = additionalIncomes.reduce((acc: number, curr: any) => acc + (parseInt(curr.amount || '0') || 0), 0);
    const totalHouseholdIncome = totalTenantIncome + totalAdditionalIncome + (parseInt(aplAmount || '0') || 0);
    const totalGuarantorIncome = guarantors.reduce((acc: number, curr: any) => {
        const salary = parseInt(curr.netIncome || '0') || 0;
        const isEligibleForAdditional = curr.type === 'FAMILY' || curr.type === 'THIRD_PARTY';
        const additional = isEligibleForAdditional
            ? curr.additionalIncomes?.reduce((subAcc: number, subCurr: any) => subAcc + (parseInt(subCurr.amount || '0') || 0), 0) || 0
            : 0;
        return acc + salary + additional;
    }, 0);

    const addGuarantor = () => {
        const current = watch('guarantors');
        setValue('guarantors', [...current, { type: 'FAMILY', status: 'CDI', netIncome: 0, additionalIncomes: [] }]);
    };

    const removeGuarantor = (index: number) => {
        const current = watch('guarantors');
        setValue('guarantors', current.filter((_: any, i: number) => i !== index));
    };

    const addGuarantorIncome = (index: number) => {
        const current = watch('guarantors');
        const updated = [...current];
        if (!updated[index].additionalIncomes) {
            updated[index].additionalIncomes = [];
        }
        updated[index].additionalIncomes.push({ type: 'OTHER', amount: 0 });
        setValue('guarantors', updated);
    };

    const removeGuarantorIncome = (guarantorIndex: number, incomeIndex: number) => {
        const current = watch('guarantors');
        const updated = [...current];
        updated[guarantorIndex].additionalIncomes = updated[guarantorIndex].additionalIncomes.filter((_: any, i: number) => i !== incomeIndex);
        setValue('guarantors', updated);
    };

    const addIncome = () => {
        const current = watch('additionalIncomes');
        setValue('additionalIncomes', [...current, { type: 'OTHER', amount: 0 }]);
    };

    const removeIncome = (index: number) => {
        const current = watch('additionalIncomes');
        setValue('additionalIncomes', current.filter((_: any, i: number) => i !== index));
    };

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        setIsLoading(true);

        const cleanedData = {
            ...data,
            guarantors: data.guarantors.map((g: any) => ({
                ...g,
                additionalIncomes: (g.type === 'FAMILY' || g.type === 'THIRD_PARTY') ? g.additionalIncomes : []
            }))
        };

        axios.post('/api/profile', cleanedData)
            .then(() => {
                toast.success(t('toasts.success'));
                router.refresh();
            })
            .catch(() => {
                toast.error(t('toasts.error'));
            })
            .finally(() => {
                setIsLoading(false);
            })
    }

    const handleDownloadDossier = () => {
        const currentData = watch();
        const profileData = {
            ...currentData,
            netSalary: parseInt(currentData.netSalary || '0'),
            partnerNetSalary: parseInt(currentData.partnerNetSalary || '0'),
            additionalIncomes: currentData.additionalIncomes?.map((i: any) => ({ ...i, amount: parseInt(i.amount || '0') })),
            guarantors: currentData.guarantors?.map((g: any) => {
                const isEligibleForAdditional = g.type === 'FAMILY' || g.type === 'THIRD_PARTY';
                return {
                    ...g,
                    netIncome: parseInt(g.netIncome || '0'),
                    additionalIncomes: isEligibleForAdditional
                        ? g.additionalIncomes?.map((i: any) => ({ ...i, amount: parseInt(i.amount || '0') }))
                        : []
                };
            }),
            aplAmount: parseInt(currentData.aplAmount || '0'),
            aplDirectPayment: currentData.aplDirectPayment
        };

        const html = generateDossierHtml(currentUser, profileData);

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        }
    };

    // Professional Situations Options
    const professionalSituations = [
        { value: 'Salarié du secteur privé', label: tEnums('job.PRIVATE_SECTOR') },
        { value: 'Fonctionnaire / agent public', label: tEnums('job.PUBLIC_SECTOR') },
        { value: 'Indépendant / profession libérale', label: tEnums('job.FREELANCE') },
        { value: 'Micro‑entrepreneur / auto‑entrepreneur', label: tEnums('job.MICRO_ENTREPRENEUR') },
        { value: 'Apprenti', label: tEnums('job.APPRENTICE') },
        { value: 'Étudiant', label: tEnums('job.STUDENT') },
        { value: 'Stagiaire / service civique / volontaire', label: tEnums('job.INTERN') },
        { value: 'Demandeur d\'emploi', label: tEnums('job.JOB_SEEKER') },
        { value: 'Retraité', label: tEnums('job.RETIRED') },
        { value: 'Homme ou femme au foyer', label: tEnums('job.HOUSEWIFE') },
        { value: 'Sans activité / sans profession', label: tEnums('job.INACTIVE') },
        { value: 'Autre situation professionnelle', label: tEnums('job.OTHER') },
    ];

    const contractTypes = [
        { value: 'CDI', label: tEnums('contract.CDI') },
        { value: 'CDD', label: tEnums('contract.CDD') },
        { value: 'Intérim / mission', label: tEnums('contract.INTERIM') },
        { value: 'Apprentissage / Alternance', label: tEnums('contract.APPRENTICESHIP') },
        { value: 'Fonctionnaire / agent public', label: tEnums('contract.PUBLIC') },
        { value: 'Indépendant / Micro‑entrepreneur / Profession libérale', label: tEnums('contract.FREELANCE') },
        { value: 'Autre', label: tEnums('contract.OTHER') },
    ];

    const incomeOptions = [
        { value: 'RENTAL', label: tEnums('income.RENTAL') },
        { value: 'ALIMONY', label: tEnums('income.ALIMONY') },
        { value: 'SCHOLARSHIP', label: tEnums('income.SCHOLARSHIP') },
        { value: 'SOCIAL_AID', label: tEnums('income.SOCIAL_AID') },
        { value: 'OTHER', label: tEnums('income.OTHER') },
    ];

    const guarantorTypeOptions = [
        { value: 'FAMILY', label: tEnums('guarantorType.FAMILY') },
        { value: 'THIRD_PARTY', label: tEnums('guarantorType.THIRD_PARTY') },
        { value: 'VISALE', label: tEnums('guarantorType.VISALE') },
        { value: 'LEGAL_ENTITY', label: tEnums('guarantorType.LEGAL_ENTITY') },
        { value: 'CAUTIONNER', label: tEnums('guarantorType.CAUTIONNER') },
        { value: 'GARANTME', label: tEnums('guarantorType.GARANTME') },
    ];

    const guarantorStatusOptions = [
        { value: 'CDI', label: tEnums('guarantorStatus.CDI') },
        { value: 'CDD', label: tEnums('guarantorStatus.CDD') },
        { value: 'RETIRED', label: tEnums('guarantorStatus.RETIRED') },
        { value: 'STUDENT', label: tEnums('guarantorStatus.STUDENT') },
        { value: 'UNEMPLOYED', label: tEnums('guarantorStatus.UNEMPLOYED') },
        { value: 'OTHER', label: tEnums('guarantorStatus.OTHER') },
    ];

    return (
        <Container>
            <div className="max-w-5xl mx-auto pb-20">
                {/* Header avec Download */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">{t('title')}</h1>
                        <p className="text-neutral-600 dark:text-neutral-400 mt-1">{t('subtitle')}</p>
                    </div>
                    <button
                        onClick={handleDownloadDossier}
                        className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg font-medium transition"
                    >
                        <Download size={18} />
                        {t('download')}
                    </button>
                </div>

                <div className="space-y-12">
                    {/* Bio Section */}
                    <section>
                        <div className="mb-4">
                            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{t('bio.title')}</h2>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{t('bio.subtitle')}</p>
                        </div>
                        <SoftTextArea
                            id="bio"
                            label={t('bio.label')}
                            disabled={isLoading}
                            register={register}
                            errors={errors}
                        />
                    </section>

                    <hr className="border-neutral-200 dark:border-neutral-800" />

                    {/* DossierFacile - HERO SECTION */}
                    <section>
                        {currentUser.accounts?.find((acc: any) => acc.provider === 'dossier-facile') ? (
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/20 dark:via-emerald-950/20 dark:to-teal-950/20 p-8">
                                <div className="relative z-10 flex flex-col items-center text-center gap-4">
                                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-2xl flex items-center justify-center shadow-lg">
                                        <ShieldCheck className="w-9 h-9 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">{t('dossierFacile.connected')}</h3>
                                        <p className="text-green-700 dark:text-green-300 max-w-md mx-auto">{t('dossierFacile.linked')}</p>
                                    </div>
                                    <a
                                        href="https://locataire.dossierfacile.fr/"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                                    >
                                        {t('dossierFacile.manage')}
                                        <ArrowRight size={18} />
                                    </a>
                                </div>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-green-400/10 rounded-full blur-3xl"></div>
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl"></div>
                            </div>
                        ) : (
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 p-8 md:p-12">
                                <div className="relative z-10 flex flex-col items-center text-center gap-6">
                                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl">
                                        <Sparkles className="w-11 h-11 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-3">
                                            Dossier certifié DossierFacile
                                        </h3>
                                        <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
                                            {t('dossierFacile.description')}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            console.log('Initiating DossierFacile sign in...');
                                            signIn('dossier-facile', { callbackUrl: '/account/tenant-profile' });
                                        }}
                                        className="group relative"
                                    >
                                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-200"></div>
                                        <div className="relative">
                                            <Image
                                                src="/images/dossier-facile-connect.png"
                                                alt="Connexion DossierFacile"
                                                width={280}
                                                height={65}
                                                className="hover:scale-105 transition-transform duration-200"
                                                style={{ height: 'auto' }}
                                            />
                                        </div>
                                    </button>
                                    <div className="flex items-start gap-3 bg-blue-100/50 dark:bg-blue-900/20 rounded-xl p-4 max-w-xl">
                                        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                        <p className="text-sm text-blue-900 dark:text-blue-200 text-left">
                                            Recommandé par l'État • Gratuit • Sécurisé • Accepté par tous les propriétaires
                                        </p>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl"></div>
                                <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl"></div>
                            </div>
                        )}
                    </section>

                    <hr className="border-neutral-200 dark:border-neutral-800" />

                    {/* Fiabilité Financière - PROFESSIONAL SECTION */}
                    <section>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Fiabilité Financière</h2>
                            <p className="text-neutral-600 dark:text-neutral-400">Prouvez votre solvabilité en connectant votre compte bancaire</p>
                        </div>

                        {tenantProfile?.rentVerified ? (
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-6">
                                <div className="flex flex-col gap-6">
                                    {/* Verified header */}
                                    <div className="flex flex-col md:flex-row items-center gap-6">
                                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/40 rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
                                            <CheckCircle className="w-11 h-11 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div className="flex-1 text-center md:text-left">
                                            <h3 className="text-xl font-bold text-green-900 dark:text-green-100 mb-1">{t('rentVerification.successTitle')}</h3>
                                            <p className="text-green-700 dark:text-green-300">{t('rentVerification.successDesc')}</p>
                                        </div>
                                        <button
                                            onClick={handleResetRent}
                                            disabled={isLoading}
                                            className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium hover:underline transition"
                                        >
                                            {t('rentVerification.reset')}
                                        </button>
                                    </div>

                                    {/* Verified payer display */}
                                    {tenantProfile.verifiedMonths > 0 && (
                                        <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800 p-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30">
                                                    <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-emerald-900 dark:text-emerald-100">
                                                        {tenantProfile.verifiedMonths >= 3 ? 'Payeur v\u00e9rifi\u00e9 \u2713' : 'V\u00e9rification en cours'}
                                                    </div>
                                                    <div className="text-sm text-emerald-700 dark:text-emerald-400">
                                                        {tenantProfile.verifiedMonths} mois v{'\u00e9'}rifi{'\u00e9'}s
                                                        {tenantProfile.punctualityRate != null && ` \u00b7 ${Math.round(tenantProfile.punctualityRate)}% r\u00e9gulier`}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Progressive gauge — max visual at 24 months */}
                                            <div className="mt-4">
                                                <div className="flex justify-between text-xs text-emerald-700 dark:text-emerald-400 mb-1">
                                                    <span>{tenantProfile.verifiedMonths} mois</span>
                                                    <span>24+ mois</span>
                                                </div>
                                                <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-emerald-500 transition-all duration-1000 ease-out"
                                                        style={{ width: `${Math.min(100, (tenantProfile.verifiedMonths / 24) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 dark:from-rose-950/20 dark:via-pink-950/20 dark:to-orange-950/20 p-6 md:p-8">
                                <div className="relative z-10 space-y-6">
                                    {/* Header avec icône centrale */}
                                    <div className="flex flex-col items-center text-center gap-4 pb-6 border-b border-rose-200 dark:border-rose-800">
                                        <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-xl">
                                            <Lock className="w-9 h-9 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">{t('rentVerification.verifyTitle')}</h3>
                                            <p className="text-neutral-600 dark:text-neutral-400 max-w-lg mx-auto">{t('rentVerification.verifyDesc')}</p>
                                        </div>
                                    </div>

                                    {/* Input Landlord */}
                                    <div>
                                        <label className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                                            {t('rentVerification.recipientLabel')}
                                        </label>
                                        <SoftInput
                                            id="landlordName"
                                            label=""
                                            placeholder={t('rentVerification.recipientPlaceholder')}
                                            disabled={isLoading}
                                            register={register}
                                            errors={errors}
                                        />
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 flex items-center gap-1">
                                            <Info size={12} />
                                            Enregistrez cette information avant de connecter votre banque
                                        </p>
                                    </div>

                                    {/* CTA Button */}
                                    <div className="flex flex-col items-center gap-3 pt-4">
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const response = await axios.get(`/api/powens/init?mode=tenant&locale=${locale}`);
                                                    window.location.href = response.data.link;
                                                } catch (error) {
                                                    toast.error("Erreur d'initialisation");
                                                }
                                            }}
                                            disabled={isLoading}
                                            className="group relative w-full md:w-auto"
                                        >
                                            <div className="absolute -inset-1 bg-gradient-to-r from-rose-600 to-pink-600 rounded-xl blur opacity-25 group-hover:opacity-75 transition duration-200"></div>
                                            <div className="relative flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105">
                                                <CreditCard size={22} />
                                                <span>{isLoading ? t('rentVerification.connecting') : t('rentVerification.connect')}</span>
                                                <ArrowRight size={20} />
                                            </div>
                                        </button>
                                        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                                            <ShieldCheck size={14} className="text-green-600 dark:text-green-400" />
                                            <span>Connexion 100% sécurisée • Vos données sont protégées</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-400/10 rounded-full blur-3xl"></div>
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-400/10 rounded-full blur-3xl"></div>
                            </div>
                        )}
                    </section>

                    {/* Rent Confirmation Modal */}
                    <Modal
                        isOpen={isRentModalOpen}
                        onClose={() => setIsRentModalOpen(false)}
                        onSubmit={handleConfirmRent}
                        title={t('rentVerification.modal.title')}
                        actionLabel={t('rentVerification.modal.confirm')}
                        secondaryActionLabel={t('rentVerification.modal.cancel')}
                        secondaryAction={() => setIsRentModalOpen(false)}
                        body={
                            <div className="flex flex-col gap-4">
                                <div className="text-center">
                                    <div className="text-4xl mb-4">🕵️‍♂️</div>
                                    <div className="text-lg font-semibold mb-2">
                                        {t('rentVerification.modal.detected', { amount: tenantProfile?.detectedRentAmount })}
                                    </div>
                                    <div className="text-neutral-500 mb-4">
                                        {t('rentVerification.modal.transactions')}
                                    </div>

                                    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-3 max-h-60 overflow-y-auto flex flex-col gap-2">
                                        {detectedTransactions.map((tx: any, index: number) => (
                                            <div key={index} className="flex justify-between items-center text-sm p-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-sm">
                                                <div className="flex flex-col items-start">
                                                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">{new Date(tx.date).toLocaleDateString()}</span>
                                                    <span className="text-xs text-neutral-500 truncate max-w-[180px]" title={tx.description}>{tx.description}</span>
                                                </div>
                                                <span className="font-bold text-neutral-900 dark:text-neutral-100">-{tx.amount} €</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="text-neutral-500 mt-4 text-sm">
                                        {t('rentVerification.modal.confirmQuestion')}
                                    </div>
                                </div>
                            </div>
                        }
                    />

                    <hr className="border-neutral-200 dark:border-neutral-800" />

                    {/* Revenus Section */}
                    <section>
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{t('job.tenantTitle')}</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SoftSelect
                                id="jobTitle"
                                label={t('job.situation')}
                                disabled={isLoading}
                                register={register}
                                errors={errors}
                                options={professionalSituations}
                            />
                            <SoftSelect
                                id="jobType"
                                label={t('job.contract')}
                                disabled={isLoading}
                                register={register}
                                errors={errors}
                                options={contractTypes}
                            />
                            <SoftInput
                                id="netSalary"
                                label={t('job.salary')}
                                type="number"
                                formatPrice
                                disabled={isLoading}
                                register={register}
                                errors={errors}
                                required
                            />
                        </div>
                    </section>

                    <hr className="border-neutral-200 dark:border-neutral-800" />

                    {/* Conjoint Section */}
                    <section>
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{t('job.partnerTitle')}</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SoftSelect
                                id="partnerJobTitle"
                                label={t('job.situation')}
                                disabled={isLoading}
                                register={register}
                                errors={errors}
                                options={professionalSituations}
                            />
                            <SoftSelect
                                id="partnerJobType"
                                label={t('job.contract')}
                                disabled={isLoading}
                                register={register}
                                errors={errors}
                                options={contractTypes}
                            />
                            <SoftInput
                                id="partnerNetSalary"
                                label={t('job.salary')}
                                type="number"
                                formatPrice
                                disabled={isLoading}
                                register={register}
                                errors={errors}
                            />
                        </div>
                    </section>

                    <hr className="border-neutral-200 dark:border-neutral-800" />

                    {/* Revenus Complémentaires */}
                    <section>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{t('additionalIncomes.title')}</h2>
                            <button
                                onClick={addIncome}
                                className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-lg font-medium transition"
                            >
                                <Plus size={18} />
                                {t('additionalIncomes.add')}
                            </button>
                        </div>
                        <div className="space-y-4">
                            {additionalIncomes.map((item: any, index: number) => (
                                <div key={index} className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="font-medium text-neutral-900 dark:text-neutral-100">{t('additionalIncomes.item', { index: index + 1 })}</span>
                                        <button
                                            onClick={() => removeIncome(index)}
                                            className="flex items-center gap-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium transition"
                                        >
                                            <Trash2 size={14} />
                                            {t('additionalIncomes.delete')}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <SoftSelect
                                            id={`additionalIncomes.${index}.type`}
                                            label={t('additionalIncomes.type')}
                                            disabled={isLoading}
                                            register={register}
                                            errors={errors}
                                            options={incomeOptions}
                                        />
                                        <SoftInput
                                            id={`additionalIncomes.${index}.amount`}
                                            label={t('additionalIncomes.amount')}
                                            type="number"
                                            formatPrice
                                            disabled={isLoading}
                                            register={register}
                                            errors={errors}
                                            required
                                        />
                                    </div>
                                </div>
                            ))}
                            {additionalIncomes.length === 0 && (
                                <div className="text-center text-neutral-500 dark:text-neutral-400 py-8 italic">
                                    {t('additionalIncomes.empty')}
                                </div>
                            )}
                        </div>
                    </section>

                    <hr className="border-neutral-200 dark:border-neutral-800" />

                    {/* APL Section */}
                    <section>
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{t('apl.title')}</h2>
                        </div>
                        <div className="space-y-4">
                            <SoftInput
                                id="aplAmount"
                                label={t('apl.amount')}
                                type="number"
                                formatPrice
                                disabled={isLoading}
                                register={register}
                                errors={errors}
                            />
                            <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                {t.rich('apl.simulation', {
                                    link: (chunks) => <a href="https://wwwd.caf.fr/wps/portal/caffr/aidesetdemarches/mesdemarches/faireunesimulation/lelogement#/preparation" target="_blank" rel="noreferrer" className="underline font-medium text-neutral-900 dark:text-neutral-100">{chunks}</a>
                                })}
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="aplDirectPayment"
                                    disabled={isLoading}
                                    {...register('aplDirectPayment')}
                                    className="h-5 w-5 rounded border-neutral-300 dark:border-neutral-600 text-rose-600 focus:ring-rose-500 cursor-pointer"
                                />
                                <label htmlFor="aplDirectPayment" className="text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
                                    {t('apl.directPayment')}
                                </label>
                            </div>
                        </div>
                    </section>

                    <hr className="border-neutral-200 dark:border-neutral-800" />

                    {/* Garants Section */}
                    <section>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{t('guarantors.title')}</h2>
                            <button
                                onClick={addGuarantor}
                                className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-lg font-medium transition"
                            >
                                <Plus size={18} />
                                {t('guarantors.add')}
                            </button>
                        </div>
                        <div className="space-y-4">
                            {guarantors.map((item: any, index: number) => (
                                <div key={index} className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="font-medium text-neutral-900 dark:text-neutral-100">{t('guarantors.item', { index: index + 1 })}</span>
                                        <button
                                            onClick={() => removeGuarantor(index)}
                                            className="flex items-center gap-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium transition"
                                        >
                                            <Trash2 size={14} />
                                            {t('guarantors.delete')}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <SoftSelect
                                            id={`guarantors.${index}.type`}
                                            label={t('guarantors.type')}
                                            disabled={isLoading}
                                            register={register}
                                            errors={errors}
                                            options={guarantorTypeOptions}
                                        />
                                        <SoftSelect
                                            id={`guarantors.${index}.status`}
                                            label={t('guarantors.status')}
                                            disabled={isLoading || (item.type !== 'FAMILY' && item.type !== 'THIRD_PARTY')}
                                            register={register}
                                            errors={errors}
                                            options={guarantorStatusOptions}
                                        />
                                        <SoftInput
                                            id={`guarantors.${index}.netIncome`}
                                            label={t('guarantors.income')}
                                            type="number"
                                            formatPrice
                                            disabled={isLoading}
                                            register={register}
                                            errors={errors}
                                            required
                                        />
                                    </div>

                                    {(item.type === 'FAMILY' || item.type === 'THIRD_PARTY') && (
                                        <div className="mt-4 p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{t('guarantors.additionalIncomeTitle')}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => addGuarantorIncome(index)}
                                                    className="text-sm text-rose-600 dark:text-rose-400 font-medium hover:underline"
                                                >
                                                    {t('guarantors.addIncome')}
                                                </button>
                                            </div>
                                            {item.additionalIncomes?.map((income: any, incomeIndex: number) => (
                                                <div key={incomeIndex} className="space-y-4 mb-4 pb-4 border-b border-neutral-200 dark:border-neutral-700 last:border-0 last:pb-0 last:mb-0">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-neutral-500 dark:text-neutral-400">{t('additionalIncomes.item', { index: incomeIndex + 1 })}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeGuarantorIncome(index, incomeIndex)}
                                                            className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium hover:underline"
                                                        >
                                                            {t('additionalIncomes.delete')}
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <SoftSelect
                                                            id={`guarantors.${index}.additionalIncomes.${incomeIndex}.type`}
                                                            label={t('additionalIncomes.type')}
                                                            disabled={isLoading}
                                                            register={register}
                                                            errors={errors}
                                                            options={incomeOptions}
                                                        />
                                                        <SoftInput
                                                            id={`guarantors.${index}.additionalIncomes.${incomeIndex}.amount`}
                                                            label={t('additionalIncomes.amount')}
                                                            type="number"
                                                            formatPrice
                                                            disabled={isLoading}
                                                            register={register}
                                                            errors={errors}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                            {(!item.additionalIncomes || item.additionalIncomes.length === 0) && (
                                                <div className="text-center text-xs text-neutral-400 dark:text-neutral-500 italic py-2">
                                                    {t('additionalIncomes.empty')}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {guarantors.length === 0 && (
                                <div className="text-center text-neutral-500 dark:text-neutral-400 py-8 italic">
                                    {t('guarantors.empty')}
                                </div>
                            )}
                        </div>
                    </section>

                    <hr className="border-neutral-200 dark:border-neutral-800" />

                    {/* Summary Section */}
                    <section>
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{t('summary.title')}</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-6">
                            <div className="space-y-3">
                                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                                    <span>{t('summary.tenant')}</span>
                                    <span className="font-medium">{parseInt(netSalary || '0')} €</span>
                                </div>
                                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                                    <span>{t('summary.partner')}</span>
                                    <span className="font-medium">{parseInt(partnerNetSalary || '0')} €</span>
                                </div>
                                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                                    <span>{t('summary.additional')}</span>
                                    <span className="font-medium">{totalAdditionalIncome} €</span>
                                </div>
                                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                                    <span>{t('summary.apl')}</span>
                                    <span className="font-medium">{parseInt(aplAmount || '0')} €</span>
                                </div>
                                <hr className="border-neutral-300 dark:border-neutral-700" />
                                <div className="flex justify-between font-bold text-lg text-neutral-900 dark:text-neutral-100">
                                    <span>{t('summary.totalHousehold')}</span>
                                    <span>{totalHouseholdIncome} €</span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {guarantors.map((g: any, index: number) => {
                                    const salary = parseInt(g.netIncome || '0') || 0;
                                    const isEligibleForAdditional = g.type === 'FAMILY' || g.type === 'THIRD_PARTY';
                                    const additional = isEligibleForAdditional
                                        ? g.additionalIncomes?.reduce((acc: number, curr: any) => acc + (parseInt(curr.amount || '0') || 0), 0) || 0
                                        : 0;
                                    return (
                                        <div key={index} className="space-y-1">
                                            <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                                                <span>{t('guarantors.item', { index: index + 1 })}</span>
                                                <span className="font-medium">{salary} €</span>
                                            </div>
                                            {additional > 0 && (
                                                <div className="flex justify-between text-neutral-500 dark:text-neutral-500 text-sm pl-4">
                                                    <span>{t('guarantors.additionalIncomeTitle')} #{index + 1}</span>
                                                    <span>{additional} €</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {guarantors.length === 0 && (
                                    <div className="text-neutral-500 dark:text-neutral-400 italic">{t('guarantors.empty')}</div>
                                )}
                                <hr className="border-neutral-300 dark:border-neutral-700" />
                                <div className="flex justify-between font-bold text-lg text-neutral-900 dark:text-neutral-100">
                                    <span>{t('summary.totalGuarantors')}</span>
                                    <span>{totalGuarantorIncome} €</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-6">
                        <button
                            onClick={() => setIsPreviewOpen(true)}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 font-medium rounded-xl transition"
                        >
                            <Eye size={20} />
                            Aperçu
                        </button>
                        <button
                            onClick={handleSubmit(onSubmit)}
                            disabled={isLoading}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                        >
                            {tCommon('save')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            <Modal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                onSubmit={() => setIsPreviewOpen(false)}
                actionLabel={tCommon('close')}
                title="Aperçu de votre dossier"
                body={
                    <TenantProfilePreview
                        user={currentUser}
                        tenantProfile={{
                            ...tenantProfile,
                            ...watch(),
                            netSalary: parseInt(watch('netSalary') || '0'),
                            partnerNetSalary: parseInt(watch('partnerNetSalary') || '0'),
                            aplAmount: parseInt(watch('aplAmount') || '0'),
                            additionalIncomes: watch('additionalIncomes')?.map((i: any) => ({ ...i, amount: parseInt(i.amount || '0') })) || [],
                            guarantors: watch('guarantors')?.map((g: any) => ({
                                ...g,
                                netIncome: parseInt(g.netIncome || '0'),
                                additionalIncomes: g.additionalIncomes?.map((i: any) => ({ ...i, amount: parseInt(i.amount || '0') })) || []
            })) || []
                        }}
                    />
                }
            />
        </Container>
    );
}

export default TenantProfileClient;
