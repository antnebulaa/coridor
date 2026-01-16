'use client';

import { SafeUser } from "@/types";
import { TenantProfile, Guarantor, Income } from "@prisma/client";
import Avatar from "@/components/Avatar";
import { ShieldCheck, CheckCircle, Briefcase, Users, Wallet, Home } from "lucide-react";

interface TenantProfilePreviewProps {
    user: SafeUser;
    tenantProfile: TenantProfile & {
        guarantors: (Guarantor & { additionalIncomes: Income[] })[];
        additionalIncomes: Income[];
        // Explicitly add fields that might be missing in generated type
        partnerNetSalary?: number | null;
        partnerJobTitle?: string | null;
        aplAmount?: number | null;
        rentVerified?: boolean;
        jobTitle?: string | null;
        jobType?: string | null;
    };
    rent?: number;
    candidateScope?: {
        compositionType: string;
        membersIds: string[];
        coupleLegalStatus?: string | null;
        targetLeaseType: string;
        targetMoveInDate?: string | null;
        childCount: number;
    } | null;
}

const TenantProfilePreview: React.FC<TenantProfilePreviewProps> = ({
    user,
    tenantProfile,
    rent,
    candidateScope
}) => {
    if (!tenantProfile) return null;

    // Helper functions
    const formatDate = (dateString?: string | null) => {
        if (!dateString) return 'Non renseignée';
        return new Date(dateString).toLocaleDateString('fr-FR');
    }

    const getCompositionLabel = (val: string) => {
        if (val === 'SOLO') return 'Seul(e)';
        if (val === 'COUPLE') return 'En couple';
        if (val === 'GROUP') return 'En colocation';
        return val;
    }
    const getStatusLabel = (val?: string | null) => {
        if (!val || val === 'NONE') return 'Célibataire / Autre';
        if (val === 'MARRIED') return 'Marié(e)';
        if (val === 'PACS') return 'Pacsé(e)';
        if (val === 'CONCUBINAGE') return 'Concubinage';
        return 'Non renseigné';
    }
    const getLeaseLabel = (val: string) => {
        if (val === 'ANY') return 'Pas de préférences';
        if (val === 'FURNISHED') return 'Meublé';
        if (val === 'EMPTY') return 'Vide';
        if (val === 'MOBILITY') return 'Mobilité';
        return val;
    }

    // Calculate totals
    const netSalary = tenantProfile.netSalary || 0;
    const partnerNetSalary = tenantProfile.partnerNetSalary || 0;
    const totalAdditionalIncome = tenantProfile.additionalIncomes?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
    const aplAmount = tenantProfile.aplAmount || 0;
    const totalHouseholdIncome = netSalary + partnerNetSalary + totalAdditionalIncome + aplAmount;

    const totalGuarantorIncome = tenantProfile.guarantors?.reduce((acc, curr) => {
        const salary = curr.netIncome || 0;
        const additional = curr.additionalIncomes?.reduce((subAcc, subCurr) => subAcc + subCurr.amount, 0) || 0;
        return acc + salary + additional;
    }, 0) || 0;

    // Rent Multiplier Calculation
    const rentMultiplier = rent && totalHouseholdIncome > 0 ? (totalHouseholdIncome / rent) : 0;
    const isSolvent = rentMultiplier >= 3;
    const effortRate = rent && totalHouseholdIncome > 0 ? (rent / totalHouseholdIncome) * 100 : 0;


    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 bg-white border border-neutral-200 rounded-xl">
                <Avatar src={user.image} seed={user.email || user.name} />
                <div className="flex flex-col">
                    <div className="text-lg font-bold flex items-center gap-2">
                        {user.name}
                        {tenantProfile.rentVerified && (
                            <span className="text-green-600" title="Loyer vérifié">
                                <ShieldCheck size={18} />
                            </span>
                        )}
                    </div>
                    <div className="text-sm text-neutral-500">
                        Candidat Locataire
                    </div>
                    <div className="mt-1 w-fit bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle size={12} />
                        <span>Identité vérifiée</span>
                    </div>
                </div>
            </div>

            {/* Rent Verification Badge */}
            {tenantProfile.rentVerified && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
                    <CheckCircle size={24} className="shrink-0" />
                    <div>
                        <div className="font-bold text-sm">Paiements de loyer certifiés</div>
                        <div className="text-xs">Ce candidat a prouvé sa régularité de paiement sur les 12 derniers mois.</div>
                    </div>
                </div>
            )}

            {/* Rental Project Section */}
            {candidateScope && (
                <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                        <Home size={16} /> Projet de location
                    </h3>
                    <div className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-col gap-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-neutral-600">Recherche</span>
                            <span className="font-medium text-neutral-900">{getCompositionLabel(candidateScope.compositionType)}</span>
                        </div>
                        {candidateScope.compositionType === 'COUPLE' && (
                            <div className="flex justify-between">
                                <span className="text-neutral-600">Statut</span>
                                <span className="font-medium text-neutral-900">{getStatusLabel(candidateScope.coupleLegalStatus)}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-neutral-600">Bail</span>
                            <span className="font-medium text-neutral-900">{getLeaseLabel(candidateScope.targetLeaseType)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-neutral-600">Emménagement</span>
                            <span className="font-medium text-neutral-900">{formatDate(candidateScope.targetMoveInDate)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-neutral-600">Enfants</span>
                            <span className="font-medium text-neutral-900">
                                {candidateScope.childCount > 0 ? candidateScope.childCount : "Aucun"}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Professional Situation */}
            <div className="flex flex-col gap-3">
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                    <Briefcase size={16} /> Situation Professionnelle
                </h3>
                <div className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                        <span className="text-neutral-600">Poste</span>
                        <span className="font-medium text-neutral-900">{tenantProfile.jobTitle || "Non renseigné"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-neutral-600">Contrat</span>
                        <span className="font-medium text-neutral-900">{tenantProfile.jobType || "Non renseigné"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-neutral-600">Revenus Nets</span>
                        <span className="font-medium text-neutral-900">{netSalary} € / mois</span>
                    </div>

                    {/* Partner */}
                    {(tenantProfile.partnerJobTitle || tenantProfile.partnerNetSalary) && (
                        <>
                            <hr className="my-1" />
                            <div className="text-sm font-bold text-neutral-900 mt-1">Conjoint·e</div>
                            <div className="flex justify-between items-center">
                                <span className="text-neutral-600">Poste</span>
                                <span className="font-medium text-neutral-900">{tenantProfile.partnerJobTitle || "Non renseigné"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-neutral-600">Revenus Nets</span>
                                <span className="font-medium text-neutral-900">{partnerNetSalary} € / mois</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Guarantors */}
            {tenantProfile.guarantors && tenantProfile.guarantors.length > 0 && (
                <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                        <Users size={16} /> Garants ({tenantProfile.guarantors.length})
                    </h3>
                    <div className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-col gap-4">
                        {tenantProfile.guarantors.map((g, i) => {
                            const typeTranslations: Record<string, string> = {
                                FAMILY: 'Garant Familial',
                                THIRD_PARTY: 'Tiers',
                                VISALE: 'Garantie Visale',
                                LEGAL_ENTITY: 'Personne Morale',
                                CAUTIONNER: 'Cautionnaire',
                                GARANTME: 'GarantMe'
                            };

                            const statusTranslations: Record<string, string> = {
                                CDI: 'CDI',
                                CDD: 'CDD',
                                RETIRED: 'Retraité',
                                STUDENT: 'Étudiant',
                                UNEMPLOYED: 'Sans emploi',
                                OTHER: 'Autre'
                            };

                            return (
                                <div key={i} className="flex justify-between items-center border-b last:border-0 pb-2 last:pb-0">
                                    <div>
                                        <div className="font-medium">{typeTranslations[g.type] || g.type}</div>
                                        <div className="text-xs text-neutral-500">{statusTranslations[g.status] || g.status}</div>
                                    </div>
                                    <div className="font-bold text-neutral-700">
                                        {g.netIncome} €
                                    </div>
                                </div>
                            );
                        })}
                        <div className="flex justify-between items-center pt-2 font-bold text-neutral-900">
                            <span>Total Garants</span>
                            <span>{totalGuarantorIncome} €</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Financial Summary */}
            <div className="flex flex-col gap-3">
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                    <Wallet size={16} /> Synthèse Financière
                </h3>
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2 text-sm">
                        <span className="text-neutral-600">Revenus du foyer</span>
                        <span className="font-medium">{netSalary + partnerNetSalary} €</span>
                    </div>
                    <div className="flex justify-between items-center mb-2 text-sm">
                        <span className="text-neutral-600">Revenus complémentaires</span>
                        <span className="font-medium">{totalAdditionalIncome} €</span>
                    </div>
                    <div className="flex justify-between items-center mb-4 text-sm">
                        <span className="text-neutral-600">Aides au logement (APL)</span>
                        <span className="font-medium">{aplAmount} €</span>
                    </div>
                    <hr className="border-neutral-300 mb-4" />
                    <div className="flex justify-between items-center text-lg font-bold text-neutral-900">
                        <span>Total Mensuel</span>
                        <span>{totalHouseholdIncome} €</span>
                    </div>
                </div>
            </div>

            {/* Effort Rate / Solvency */}
            {rent && (
                <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                        <Home size={16} /> Solvabilité
                    </h3>
                    <div className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-1">
                                <span className="font-bold text-lg text-neutral-900">
                                    Revenus : {rentMultiplier.toFixed(1)}x le loyer
                                </span>
                                <span className="text-sm text-neutral-500">
                                    Loyer : {rent} €
                                </span>
                                <span className="text-sm text-neutral-500">
                                    Taux d&apos;effort : {effortRate.toFixed(0)}%
                                </span>
                            </div>
                        </div>

                        {/* Visual Effort Bar */}
                        <div className="flex flex-col gap-2">
                            <div className="w-full h-4 bg-neutral-100 rounded-full overflow-hidden flex">
                                {/* Rent Share */}
                                <div
                                    className="h-full bg-primary"
                                    style={{ width: `${Math.min(effortRate, 100)}%` }}
                                />
                                {/* Remaining Income */}
                                <div
                                    className="h-full bg-neutral-200"
                                    style={{ width: `${Math.max(0, 100 - effortRate)}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-neutral-500 font-medium">
                                <span>Loyer ({effortRate.toFixed(0)}%)</span>
                                <span>Reste à vivre ({totalHouseholdIncome - rent} €)</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                            <div className={`w-2 h-2 rounded-full ${isSolvent ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                            <span className="text-neutral-600">
                                {isSolvent
                                    ? "Solvabilité validée (> 3x le loyer)"
                                    : "Solvabilité juste (< 3x le loyer)"}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TenantProfilePreview;
