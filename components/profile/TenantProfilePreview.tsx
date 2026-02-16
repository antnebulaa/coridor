'use client';

import { SafeUser } from "@/types";
import { TenantProfile, Guarantor, Income } from "@prisma/client";
import Avatar from "@/components/Avatar";
import { ShieldCheck, CheckCircle, Briefcase, Users, Wallet, Home, Info } from "lucide-react";
import PaymentBadge from "@/components/profile/PaymentBadge";

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
        bio?: string | null;
        badgeLevel?: string | null;
        verifiedMonths?: number;
        punctualityRate?: number | null;
    };
    rent?: number;
    charges?: any; // { amount: number, included: boolean }
    candidateScope?: {
        compositionType: string;
        membersIds: string[];
        coupleLegalStatus?: string | null;
        targetLeaseType: string;
        targetMoveInDate?: string | null;
        childCount: number;
    } | null;
    showFullDossierLink?: boolean;
}

const TenantProfilePreview: React.FC<TenantProfilePreviewProps> = ({
    user,
    tenantProfile,
    rent,
    charges,
    candidateScope,
    showFullDossierLink
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
    // Rent Multiplier Calculation
    const chargesAmount = charges?.amount || 0;
    const totalMonthlyCost = (rent || 0) + chargesAmount;

    const rentMultiplier = totalMonthlyCost > 0 && totalHouseholdIncome > 0 ? (totalHouseholdIncome / totalMonthlyCost) : 0;
    const effortRate = totalMonthlyCost > 0 && totalHouseholdIncome > 0 ? (totalMonthlyCost / totalHouseholdIncome) * 100 : 0;

    const remainingIncome = totalHouseholdIncome - totalMonthlyCost;

    let solvencyStatus = { color: 'bg-red-500', label: 'Reste à vivre faible' };
    if (remainingIncome >= 4000) {
        solvencyStatus = { color: 'bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 animate-pulse', label: 'Reste à vivre très élevé' };
    } else if (remainingIncome >= 2500) {
        solvencyStatus = { color: 'bg-purple-500', label: 'Reste à vivre élevé' };
    } else if (remainingIncome >= 1500) {
        solvencyStatus = { color: 'bg-green-500', label: 'Reste à vivre confortable' };
    } else if (remainingIncome >= 800) {
        solvencyStatus = { color: 'bg-orange-500', label: 'Reste à vivre standard' };
    }


    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 bg-white border border-neutral-200 rounded-xl">
                <Avatar src={user.image} seed={user.email || user.name} />
                <div className="flex flex-col">
                    <div className="text-lg font-bold flex items-center gap-2">
                        {user.name}
                        {tenantProfile.badgeLevel ? (
                            <PaymentBadge badgeLevel={tenantProfile.badgeLevel} compact />
                        ) : tenantProfile.rentVerified ? (
                            <span className="text-green-600" title="Loyer vérifié">
                                <ShieldCheck size={18} />
                            </span>
                        ) : null}
                    </div>
                    <div className="text-sm text-neutral-500">
                        Candidat Locataire
                    </div>
                </div>
            </div>

            {/* Bio Section */}
            {tenantProfile.bio && (
                <div className="flex flex-col gap-6 mt-5">
                    <h3 className="text-2xl font-medium text-neutral-900 flex items-center gap-2">
                         À propos de {user.name?.split(' ')[0]}
                    </h3>
                    <div className="bg-white border border-neutral-200 rounded-xl p-4 text-base text-neutral-700 italic">
                        "{tenantProfile.bio}"
                    </div>
                </div>
            )}

            {/* Payment Badge */}
            {tenantProfile.badgeLevel ? (
                <PaymentBadge
                    badgeLevel={tenantProfile.badgeLevel}
                    verifiedMonths={tenantProfile.verifiedMonths}
                    punctualityRate={tenantProfile.punctualityRate}
                />
            ) : tenantProfile.rentVerified ? (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
                    <CheckCircle size={24} className="shrink-0" />
                    <div>
                        <div className="font-bold text-sm">Paiements de loyer certifiés</div>
                        <div className="text-xs">Ce candidat a prouvé sa régularité de paiement sur les 12 derniers mois.</div>
                    </div>
                </div>
            ) : null}

            {/* Access to Full Dossier (Conditionally Shown) */}
            {showFullDossierLink && (
                <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-medium text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                        <ShieldCheck size={16} /> Dossier Complet
                    </h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col gap-3">
                        <div className="text-sm text-blue-900">
                            Puisque vous avez proposé une visite, vous avez accès au dossier complet certifié par l'État.
                        </div>
                        <a
                            href="https://proprietaire.dossierfacile.fr" // Ideally deep link if possible, or just the portal
                            target="_blank"
                            rel="noopener noreferrer"
                            className="
                                flex items-center justify-center gap-2
                                w-full py-3 px-4 
                                bg-blue-600 hover:bg-blue-700 
                                text-white font-medium rounded-lg 
                                transition
                            "
                        >
                            <img src="/images/dossier-facile-logo.png" alt="DF" className="w-5 h-5 object-contain brightness-0 invert" />
                            Voir le dossier complet
                        </a>
                    </div>
                </div>
            )}

            {/* Rental Project Section */}
            {candidateScope && (
                <div className="flex flex-col gap-6 mt-5">
                    <h3 className="text-2xl font-medium text-neutral-900 flex items-center gap-2">
                         Projet de location
                    </h3>
                    <div className="bg-neutral-100 rounded-2xl p-4 flex flex-col gap-3 text-sm">
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
            <div className="flex flex-col gap-6 mt-5">
                <h3 className="text-2xl font-medium text-neutral-900 flex items-center gap-2">
                     Situation Professionnelle
                </h3>
                <div className="bg-neutral-100 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-600">Poste</span>
                        <span className="font-medium text-neutral-900">{tenantProfile.jobTitle || "Non renseigné"}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-600">Contrat</span>
                        <span className="font-medium text-neutral-900">{tenantProfile.jobType || "Non renseigné"}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-600">Revenus Nets</span>
                        <span className="font-medium text-neutral-900">{netSalary} € / mois</span>
                    </div>

                    {/* Partner */}
                    {(tenantProfile.partnerJobTitle || tenantProfile.partnerNetSalary) && (
                        <>
                            <hr className="my-1" />
                            <div className="text-sm font-bold text-neutral-900 mt-1">Conjoint·e</div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-neutral-600">Poste</span>
                                <span className="font-medium text-neutral-900">{tenantProfile.partnerJobTitle || "Non renseigné"}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
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
                    <h3 className="text-base font-medium text-neutral-900 flex items-center gap-2">
                        <Users size={16} /> Garants ({tenantProfile.guarantors.length})
                    </h3>
                    <div className="bg-neutral-50 rounded-xl p-4 flex flex-col gap-0 text-sm">
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
                                <div key={i} className="flex justify-between items-center pb-2 last:pb-0 text-sm">
                                    <div>
                                        <div className="font-medium">{typeTranslations[g.type] || g.type}</div>
                                        <div className="text-neutral-500">{statusTranslations[g.status] || g.status}</div>
                                    </div>
                                    <div className="font-medium text-neutral-700">
                                        {g.netIncome} €
                                    </div>
                                </div>
                            );
                        })}
                        <hr className="border-neutral-300 mb-4" />
                        <div className="flex justify-between items-center text-lg font-medium text-neutral-900">
                            <span>Total Garants</span>
                            <span>{totalGuarantorIncome} €</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Financial Summary */}
            <div className="flex flex-col gap-6 mt-5">
                <h3 className="text-2xl font-medium text-neutral-900 flex items-center gap-2">
                     Synthèse Financière
                </h3>
                <div className="bg-neutral-50 rounded-xl p-4">
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
                    <div className="flex justify-between items-center text-lg font-medium text-neutral-900">
                        <span>Total Mensuel</span>
                        <span>{totalHouseholdIncome} €</span>
                    </div>
                </div>
            </div>

            {/* Effort Rate / Solvency */}
            {rent && (
                <div className="flex flex-col gap-6 mt-5">
                    <h3 className="text-2xl font-medium text-neutral-900 flex items-center gap-2">
                         Solvabilité
                    </h3>
                    <div className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-1">
                                <span className="font-medium text-lg text-neutral-900">
                                    Revenus : {rentMultiplier.toFixed(1)} × le loyer
                                </span>
                                <span className="text-sm text-neutral-500">
                                    Loyer : {rent} € {chargesAmount > 0 && `+ ${chargesAmount} € charges`}
                                </span>
                                <span className="text-sm text-neutral-500">
                                    Taux d&apos;effort : {effortRate.toFixed(0)}%
                                </span>
                                <span className="text-sm text-neutral-500">
                                    Reste à vivre : {totalHouseholdIncome - rent} €
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
                                    className="h-full bg-neutral-500"
                                    style={{ width: `${Math.max(0, 100 - effortRate)}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-neutral-500 font-medium">
                                <span className="text-neutral-900">Loyer </span>
                                <span className="text-neutral-900">Reste à vivre </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                            <div className={`w-4 h-4 rounded-full ${solvencyStatus.color}`}></div>
                            <span className="text-neutral-600">
                                {solvencyStatus.label}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TenantProfilePreview;
