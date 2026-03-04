'use client';

import { SafeUser } from '@/types';
import { Shield, BadgeCheck, PawPrint, GraduationCap, Check, X } from 'lucide-react';

interface Requirements {
    payerBadgePreferred: boolean;
    guarantorPreferred: boolean;
    petsWelcome: boolean;
    studentsWelcome: boolean;
}

interface ListingRequirementsCardProps {
    listingId: string;
    currentUser: SafeUser | null;
    requirements: Requirements | null;
}

const ListingRequirementsCard: React.FC<ListingRequirementsCardProps> = ({
    listingId,
    currentUser,
    requirements,
}) => {
    if (!requirements) return null;

    const hasAnyPreference =
        requirements.payerBadgePreferred ||
        requirements.guarantorPreferred ||
        requirements.petsWelcome ||
        requirements.studentsWelcome;

    if (!hasAnyPreference) return null;

    const tenantProfile = (currentUser as any)?.tenantProfile;
    const hasBadge = tenantProfile?.verificationStatus === 'VERIFIED';
    const hasGuarantor = tenantProfile?.guarantors?.length > 0;

    return (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 bg-white dark:bg-neutral-900">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-4">
                Ce que recherche le propriétaire
            </h3>

            <div className="flex flex-col gap-2.5">
                {requirements.payerBadgePreferred && (
                    <div className="flex items-center justify-between py-2 border-b border-neutral-50 dark:border-neutral-800 last:border-b-0">
                        <div className="flex items-center gap-2.5">
                            <BadgeCheck size={16} className="text-neutral-500 dark:text-neutral-400" />
                            <span className="text-sm text-neutral-700 dark:text-neutral-300">Badge Payeur Vérifié</span>
                        </div>
                        {currentUser && (
                            hasBadge
                                ? <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium"><Check size={14} /> Vous l&apos;avez</span>
                                : <span className="flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500"><X size={14} /> Non vérifié</span>
                        )}
                    </div>
                )}

                {requirements.guarantorPreferred && (
                    <div className="flex items-center justify-between py-2 border-b border-neutral-50 dark:border-neutral-800 last:border-b-0">
                        <div className="flex items-center gap-2.5">
                            <Shield size={16} className="text-neutral-500 dark:text-neutral-400" />
                            <span className="text-sm text-neutral-700 dark:text-neutral-300">Garant</span>
                        </div>
                        {currentUser && (
                            hasGuarantor
                                ? <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium"><Check size={14} /> Renseigné</span>
                                : <span className="flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500"><X size={14} /> Non renseigné</span>
                        )}
                    </div>
                )}

                {requirements.petsWelcome && (
                    <div className="flex items-center gap-2.5 py-2 border-b border-neutral-50 dark:border-neutral-800 last:border-b-0">
                        <PawPrint size={16} className="text-neutral-500 dark:text-neutral-400" />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">Animaux bienvenus</span>
                    </div>
                )}

                {requirements.studentsWelcome && (
                    <div className="flex items-center gap-2.5 py-2 border-b border-neutral-50 dark:border-neutral-800 last:border-b-0">
                        <GraduationCap size={16} className="text-neutral-500 dark:text-neutral-400" />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">Étudiants bienvenus</span>
                    </div>
                )}
            </div>

            {!currentUser && (
                <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                        Créez votre Passeport Coridor pour postuler en un clic avec votre profil vérifié
                    </p>
                </div>
            )}
        </div>
    );
};

export default ListingRequirementsCard;
