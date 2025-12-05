'use client';

import axios from "axios";
import { useState, useEffect, useRef } from "react";
import { FieldValues, SubmitHandler, useForm, useFieldArray } from "react-hook-form";
import { toast } from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { SafeUser } from "@/types";
import { GuarantorType, GuarantorStatus, IncomeType } from "@prisma/client";
import { generateDossierHtml } from "@/utils/dossierGenerator";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { Info, ShieldCheck, CheckCircle, AlertCircle, Eye } from "lucide-react";
import Modal from "@/components/modals/Modal";

import Container from "@/components/Container";
import Heading from "@/components/Heading";
import SoftInput from "@/components/inputs/SoftInput";
import SoftSelect from "@/components/inputs/SoftSelect";
import { Button } from "@/components/ui/Button";
import SoftButton from "@/components/ui/SoftButton";
import TenantProfilePreview from "@/components/profile/TenantProfilePreview";

interface TenantProfileClientProps {
    currentUser: SafeUser;
    tenantProfile: any; // Full profile with relations
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
    const [recipientName, setRecipientName] = useState("");
    const [detectedTransactions, setDetectedTransactions] = useState<any[]>([]);
    const processingRef = useRef(false);

    const handleConnectBank = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get('/api/powens/init');
            window.location.href = response.data.link;
        } catch (error) {
            toast.error("Impossible d'initialiser la connexion.");
            setIsLoading(false);
        }
    };

    const handleAnalyzeRent = async (code: string) => {
        if (processingRef.current) return;
        processingRef.current = true;
        setIsLoading(true);

        try {
            const response = await axios.post('/api/powens/analyze', {
                code,
                recipientName
            });
            if (response.data.found) {
                setDetectedTransactions(response.data.transactions || []);
                setIsRentModalOpen(true);
                // Remove code from URL to prevent re-trigger
                router.replace('/account/tenant-profile');
            } else {
                toast.error("Aucun paiement de loyer récurrent détecté.");
                router.replace('/account/tenant-profile');
            }
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de l'analyse.");
            router.replace('/account/tenant-profile');
        } finally {
            setIsLoading(false);
            processingRef.current = false;
        }
    };

    // Check for Powens callback (code)
    useEffect(() => {
        const code = params?.get('code');
        if (code && !isRentModalOpen && !tenantProfile?.rentVerified) {
            handleAnalyzeRent(code);
        }
    }, [params, isRentModalOpen, tenantProfile?.rentVerified]);

    const handleConfirmRent = async () => {
        setIsLoading(true);
        try {
            await axios.post('/api/profile/verify-rent');
            toast.success("Fiabilité confirmée !");
            setIsRentModalOpen(false);
            router.refresh();
        } catch (error) {
            toast.error("Erreur lors de la confirmation.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetRent = async () => {
        if (!confirm("Voulez-vous vraiment supprimer cette vérification ?")) return;

        setIsLoading(true);
        try {
            await axios.delete('/api/profile/verify-rent');
            toast.success("Vérification supprimée.");
            router.refresh();
        } catch (error) {
            toast.error("Erreur lors de la suppression.");
        } finally {
            setIsLoading(false);
        }
    };

    // Prepare default values
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
        aplDirectPayment: tenantProfile?.aplDirectPayment || false
    };

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        control,
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

        // Filter out additional incomes for non-eligible guarantor types
        const cleanedData = {
            ...data,
            guarantors: data.guarantors.map((g: any) => ({
                ...g,
                additionalIncomes: (g.type === 'FAMILY' || g.type === 'THIRD_PARTY') ? g.additionalIncomes : []
            }))
        };

        axios.post('/api/profile', cleanedData)
            .then(() => {
                toast.success('Profil mis à jour !');
                router.refresh();
            })
            .catch(() => {
                toast.error('Une erreur est survenue.');
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

    return (
        <Container>
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-row items-center justify-between mb-8">
                    <Heading
                        title="Mon Dossier Locataire"
                        subtitle="Complétez votre profil pour postuler aux annonces."
                    />
                    <Button
                        label="Télécharger le dossier"
                        onClick={handleDownloadDossier}
                        small
                        variant="outline"
                    />
                </div>

                <div className="flex flex-col gap-10">
                    {/* DossierFacile Section */}
                    <div className="flex flex-col items-center text-center gap-4 p-8 border border-[#dddddd] rounded-xl bg-neutral-50">
                        <button
                            onClick={() => signIn('dossier-facile')}
                            className="hover:opacity-90 transition"
                        >
                            <Image
                                src="/images/dossier-facile-connect.png"
                                alt="Connexion DossierFacile"
                                width={240}
                                height={55}
                                style={{ height: 'auto' }}
                            />
                        </button>
                        <div className="flex gap-2 items-center justify-center text-sm text-neutral-600 max-w-lg">
                            <Info size={16} className="shrink-0" />
                            <p>
                                DossierFacile est le dossier de location numérique de l&apos;Etat. Entièrement gratuit, conforme et sécurisé, il protège les locataires et rassure les propriétaires.
                            </p>
                        </div>
                    </div>

                    {/* Rent Verification Badge or Button */}
                    <div className="flex flex-col gap-4 p-6 border border-[#dddddd] rounded-xl bg-white">
                        <h3 className="text-xl font-semibold flex items-center gap-2">
                            Fiabilité Financière
                            {tenantProfile?.rentVerified && (
                                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold flex items-center gap-1">
                                    <ShieldCheck size={14} />
                                    VÉRIFIÉ
                                </span>
                            )}
                        </h3>

                        {tenantProfile?.rentVerified ? (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                                    <CheckCircle size={32} />
                                    <div>
                                        <div className="font-bold">Paiements de loyer détectés sur 12 mois</div>
                                        <div className="text-sm">Votre régularité de paiement est certifiée. C&apos;est un atout majeur pour votre dossier !</div>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleResetRent}
                                        disabled={isLoading}
                                        className="text-xs text-red-400 hover:text-red-600 hover:underline transition"
                                    >
                                        Réinitialiser la vérification
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                                        <ShieldCheck size={24} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-blue-900">Prouver ma fiabilité</div>
                                        <div className="text-sm text-blue-700">Connectez votre compte bancaire pour certifier vos paiements de loyer. (Sécurisé par Powens)</div>
                                        <div className="mt-3">
                                            <label className="text-xs font-bold text-blue-800 block mb-1">
                                                Nom du bénéficiaire (Optionnel, pour aider la détection)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Ex: Agence Immo, M. Dupont..."
                                                value={recipientName}
                                                onChange={(e) => setRecipientName(e.target.value)}
                                                className="w-full p-2 text-sm border border-blue-300 rounded-md bg-white text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    label={isLoading ? "Récupération des loyers..." : "Connecter ma banque"}
                                    onClick={handleConnectBank}
                                    disabled={isLoading}
                                    loading={isLoading}
                                />
                            </div>
                        )}
                    </div>

                    {/* Rent Confirmation Modal */}
                    <Modal
                        isOpen={isRentModalOpen}
                        onClose={() => setIsRentModalOpen(false)}
                        onSubmit={handleConfirmRent}
                        title="Confirmation de loyer"
                        actionLabel="Oui, c'est mon loyer"
                        secondaryActionLabel="Non"
                        secondaryAction={() => setIsRentModalOpen(false)}
                        body={
                            <div className="flex flex-col gap-4">
                                <div className="text-center">
                                    <div className="text-4xl mb-4">🕵️‍♂️</div>
                                    <div className="text-lg font-semibold mb-2">
                                        Nous avons détecté des virements réguliers de {tenantProfile?.detectedRentAmount} €
                                    </div>
                                    <div className="text-neutral-500 mb-4">
                                        Voici les transactions identifiées :
                                    </div>

                                    <div className="bg-neutral-50 rounded-lg p-3 max-h-60 overflow-y-auto flex flex-col gap-2">
                                        {detectedTransactions.map((tx: any, index: number) => (
                                            <div key={index} className="flex justify-between items-center text-sm p-2 bg-white border rounded shadow-sm">
                                                <div className="flex flex-col items-start">
                                                    <span className="font-semibold text-neutral-700">{new Date(tx.date).toLocaleDateString()}</span>
                                                    <span className="text-xs text-neutral-500 truncate max-w-[180px]" title={tx.description}>{tx.description}</span>
                                                </div>
                                                <span className="font-bold text-neutral-900">-{tx.amount} €</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="text-neutral-500 mt-4 text-sm">
                                        Est-ce bien votre loyer actuel ? En confirmant, vous obtiendrez le badge "Paiements de loyer détectés".
                                    </div>
                                </div>
                            </div>
                        }
                    />

                    {/* Tenant Section */}
                    <div className="flex flex-col gap-6 p-6 border border-[#dddddd] rounded-xl bg-white">
                        <h3 className="text-xl font-semibold">Emploi & Revenus (Vous)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <SoftInput
                                id="jobTitle"
                                label="Intitulé du poste"
                                disabled={isLoading}
                                register={register}
                                errors={errors}
                                required
                            />
                            <SoftInput
                                id="jobType"
                                label="Type de contrat (CDI, CDD...)"
                                disabled={isLoading}
                                register={register}
                                errors={errors}
                                required
                            />
                            <SoftInput
                                id="netSalary"
                                label="Salaire Net Mensuel (€)"
                                type="number"
                                formatPrice
                                disabled={isLoading}
                                register={register}
                                errors={errors}
                                required
                            />
                        </div>
                    </div>

                    {/* Partner Section */}
                    <div className="flex flex-col gap-6 p-6 border border-[#dddddd] rounded-xl bg-white">
                        <h3 className="text-xl font-semibold">Emploi & Revenus (Conjoint·e)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <SoftInput
                                id="partnerJobTitle"
                                label="Intitulé du poste"
                                disabled={isLoading}
                                register={register}
                                errors={errors}
                            />
                            <SoftInput
                                id="partnerJobType"
                                label="Type de contrat (CDI, CDD...)"
                                disabled={isLoading}
                                register={register}
                                errors={errors}
                            />
                            <SoftInput
                                id="partnerNetSalary"
                                label="Salaire Net Mensuel (€)"
                                type="number"
                                formatPrice
                                disabled={isLoading}
                                register={register}
                                errors={errors}
                            />
                        </div>
                    </div>

                    {/* Additional Incomes Section */}
                    <div className="flex flex-col gap-6 p-6 border border-[#dddddd] rounded-xl bg-white">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-semibold">Revenus Complémentaires</h3>
                            <SoftButton
                                label="Ajouter un revenu"
                                onClick={addIncome}
                            />
                        </div>
                        {additionalIncomes.map((item: any, index: number) => (
                            <div key={index} className="p-4 border border-[#dddddd] rounded-lg flex flex-col gap-4 bg-gray-50">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-gray-700">Revenu #{index + 1}</span>
                                    <button
                                        onClick={() => removeIncome(index)}
                                        className="text-red-500 hover:underline text-sm font-medium"
                                    >
                                        Supprimer
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <SoftSelect
                                        id={`additionalIncomes.${index}.type`}
                                        label="Type"
                                        disabled={isLoading}
                                        register={register}
                                        errors={errors}
                                        options={[
                                            { value: 'RENTAL', label: 'Revenus Locatifs' },
                                            { value: 'ALIMONY', label: 'Pension Alimentaire' },
                                            { value: 'SCHOLARSHIP', label: 'Bourse' },
                                            { value: 'SOCIAL_AID', label: 'Aides Sociales (CAF...)' },
                                            { value: 'OTHER', label: 'Autre' },
                                        ]}
                                    />
                                    <SoftInput
                                        id={`additionalIncomes.${index}.amount`}
                                        label="Montant (€)"
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
                            <div className="text-center text-gray-500 py-4 italic">
                                Aucun revenu complémentaire ajouté.
                            </div>
                        )}
                    </div>

                    {/* APL Section */}
                    <div className="flex flex-col gap-6 p-6 border border-[#dddddd] rounded-xl bg-white">
                        <h3 className="text-xl font-semibold">Aides au Logement (APL)</h3>
                        <div className="flex flex-col gap-4">
                            <SoftInput
                                id="aplAmount"
                                label="Aides au logement estimées (€)"
                                type="number"
                                formatPrice
                                disabled={isLoading}
                                register={register}
                                errors={errors}
                            />
                            <div className="text-sm text-neutral-500">
                                Pas sûr ? <a href="https://wwwd.caf.fr/wps/portal/caffr/aidesetdemarches/mesdemarches/faireunesimulation/lelogement#/preparation" target="_blank" rel="noreferrer" className="underline font-medium text-black">Faire la simulation officielle</a>
                            </div>
                            <div className="flex flex-row items-center gap-3 mt-2">
                                <input
                                    type="checkbox"
                                    id="aplDirectPayment"
                                    disabled={isLoading}
                                    {...register('aplDirectPayment')}
                                    className="
                                        h-5 w-5 
                                        rounded 
                                        border-gray-300 
                                        text-primary 
                                        focus:ring-primary
                                        cursor-pointer
                                    "
                                />
                                <label htmlFor="aplDirectPayment" className="text-sm text-neutral-600 cursor-pointer select-none">
                                    Autoriser le versement direct de l&apos;APL au propriétaire (Tiers Payant)
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Guarantors Section */}
                    <div className="flex flex-col gap-6 p-6 border border-[#dddddd] rounded-xl bg-white">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-semibold">Garants</h3>
                            <SoftButton
                                label="Ajouter un garant"
                                onClick={addGuarantor}
                            />
                        </div>
                        {guarantors.map((item: any, index: number) => (
                            <div key={index} className="p-4 border border-[#dddddd] rounded-lg flex flex-col gap-4 bg-gray-50">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-gray-700">Garant #{index + 1}</span>
                                    <button
                                        onClick={() => removeGuarantor(index)}
                                        className="text-red-500 hover:underline text-sm font-medium"
                                    >
                                        Supprimer
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <SoftSelect
                                        id={`guarantors.${index}.type`}
                                        label="Type"
                                        disabled={isLoading}
                                        register={register}
                                        errors={errors}
                                        options={[
                                            { value: 'FAMILY', label: 'Famille' },
                                            { value: 'THIRD_PARTY', label: 'Tiers' },
                                            { value: 'VISALE', label: 'Visale' },
                                            { value: 'LEGAL_ENTITY', label: 'Personne Morale' },
                                            { value: 'CAUTIONNER', label: 'Cautioneo' },
                                            { value: 'GARANTME', label: 'GarantMe' },
                                        ]}
                                    />
                                    <SoftSelect
                                        id={`guarantors.${index}.status`}
                                        label="Statut"
                                        disabled={isLoading || (item.type !== 'FAMILY' && item.type !== 'THIRD_PARTY')}
                                        register={register}
                                        errors={errors}
                                        options={[
                                            { value: 'CDI', label: 'CDI' },
                                            { value: 'CDD', label: 'CDD' },
                                            { value: 'RETIRED', label: 'Retraité' },
                                            { value: 'STUDENT', label: 'Étudiant' },
                                            { value: 'UNEMPLOYED', label: 'Sans emploi' },
                                            { value: 'OTHER', label: 'Autre' },
                                        ]}
                                    />
                                    <SoftInput
                                        id={`guarantors.${index}.netIncome`}
                                        label="Revenu Net Mensuel (€)"
                                        type="number"
                                        formatPrice
                                        disabled={isLoading}
                                        register={register}
                                        errors={errors}
                                        required
                                    />
                                </div>

                                {(item.type === 'FAMILY' || item.type === 'THIRD_PARTY') && (
                                    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-sm font-medium text-gray-700">Revenus Complémentaires (Garant)</span>
                                            <button
                                                type="button"
                                                onClick={() => addGuarantorIncome(index)}
                                                className="text-sm text-primary font-medium hover:underline"
                                            >
                                                + Ajouter
                                            </button>
                                        </div>
                                        {item.additionalIncomes?.map((income: any, incomeIndex: number) => (
                                            <div key={incomeIndex} className="flex flex-col gap-4 mb-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0 last:mb-0">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-gray-500">Revenu #{incomeIndex + 1}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeGuarantorIncome(index, incomeIndex)}
                                                        className="text-xs text-red-500 hover:underline"
                                                    >
                                                        Supprimer
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <SoftSelect
                                                        id={`guarantors.${index}.additionalIncomes.${incomeIndex}.type`}
                                                        label="Type"
                                                        disabled={isLoading}
                                                        register={register}
                                                        errors={errors}
                                                        options={[
                                                            { value: 'RENTAL', label: 'Revenus Locatifs' },
                                                            { value: 'ALIMONY', label: 'Pension Alimentaire' },
                                                            { value: 'SCHOLARSHIP', label: 'Bourse' },
                                                            { value: 'SOCIAL_AID', label: 'Aides Sociales' },
                                                            { value: 'OTHER', label: 'Autre' },
                                                        ]}
                                                    />
                                                    <SoftInput
                                                        id={`guarantors.${index}.additionalIncomes.${incomeIndex}.amount`}
                                                        label="Montant (€)"
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
                                            <div className="text-center text-xs text-gray-400 italic py-2">
                                                Aucun revenu complémentaire
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        {guarantors.length === 0 && (
                            <div className="text-center text-gray-500 py-4 italic">
                                Aucun garant ajouté.
                            </div>
                        )}
                    </div>

                    {/* Summary Section */}
                    <div className="flex flex-col gap-6 p-6 border border-[#dddddd] rounded-xl bg-neutral-50">
                        <h3 className="text-xl font-semibold">Récapitulatif Financier</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between text-gray-600">
                                    <span>Salaire Net (Vous)</span>
                                    <span>{parseInt(netSalary || '0')} €</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Salaire Net (Conjoint·e)</span>
                                    <span>{parseInt(partnerNetSalary || '0')} €</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Revenus Complémentaires</span>
                                    <span>{totalAdditionalIncome} €</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Aides au Logement</span>
                                    <span>{parseInt(aplAmount || '0')} €</span>
                                </div>
                                <hr className="my-2 border-gray-300" />
                                <div className="flex justify-between font-bold text-lg text-gray-900">
                                    <span>Total Foyer</span>
                                    <span>{totalHouseholdIncome} €</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                {guarantors.map((g: any, index: number) => {
                                    const salary = parseInt(g.netIncome || '0') || 0;
                                    const isEligibleForAdditional = g.type === 'FAMILY' || g.type === 'THIRD_PARTY';
                                    const additional = isEligibleForAdditional
                                        ? g.additionalIncomes?.reduce((acc: number, curr: any) => acc + (parseInt(curr.amount || '0') || 0), 0) || 0
                                        : 0;
                                    return (
                                        <div key={index} className="flex flex-col gap-1 mb-2">
                                            <div className="flex justify-between text-gray-600">
                                                <span>Revenus Garant #{index + 1}</span>
                                                <span>{salary} €</span>
                                            </div>
                                            {additional > 0 && (
                                                <div className="flex justify-between text-gray-500 text-sm pl-4">
                                                    <span>Revenus Complémentaires #{index + 1}</span>
                                                    <span>{additional} €</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {guarantors.length === 0 && (
                                    <div className="text-gray-500 italic">Aucun garant</div>
                                )}
                                <hr className="my-2 border-gray-300" />
                                <div className="flex justify-between font-bold text-lg text-gray-900">
                                    <span>Total Garants</span>
                                    <span>{totalGuarantorIncome} €</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end gap-4">
                        <Button
                            label="Aperçu"
                            onClick={() => setIsPreviewOpen(true)}
                            variant="outline"
                            icon={Eye}
                        />
                        <div className="w-full md:w-auto">
                            <Button
                                label="Enregistrer le profil"
                                onClick={handleSubmit(onSubmit)}
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            <Modal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                onSubmit={() => setIsPreviewOpen(false)}
                actionLabel="Fermer"
                title="Aperçu de votre dossier"
                body={
                    <TenantProfilePreview
                        user={currentUser}
                        tenantProfile={{
                            ...tenantProfile,
                            ...watch(), // Use live form data for preview
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
