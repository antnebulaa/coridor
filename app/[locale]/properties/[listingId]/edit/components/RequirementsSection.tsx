'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Shield, BadgeCheck, PawPrint, GraduationCap, Info } from 'lucide-react';
import { SafeListing } from '@/types';
import EditSectionFooter from './EditSectionFooter';
import CustomToast from '@/components/ui/CustomToast';

interface RequirementsSectionProps {
    listing: SafeListing;
}

function ToggleSwitch({
    checked,
    onChange,
    label,
    subtitle,
    icon: Icon,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    subtitle?: string;
    icon?: React.ElementType;
}) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`
                p-4 rounded-2xl border flex items-center gap-4 text-left transition w-full
                ${checked
                    ? 'border-black dark:border-white bg-neutral-50 dark:bg-neutral-800'
                    : 'border-neutral-200 dark:border-neutral-700'
                }
            `}
        >
            {Icon && (
                <div className={`
                    w-9 h-9 rounded-full flex items-center justify-center shrink-0
                    ${checked
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                    }
                `}>
                    <Icon size={18} />
                </div>
            )}
            <div className="flex-1">
                <span className="font-medium text-sm">{label}</span>
                {subtitle && (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 block mt-0.5">
                        {subtitle}
                    </span>
                )}
            </div>
            <div className={`
                w-10 h-6 rounded-full transition-colors relative shrink-0
                ${checked ? 'bg-black dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'}
            `}>
                <div className={`
                    w-5 h-5 rounded-full bg-white dark:bg-neutral-900 absolute top-0.5 transition-transform
                    ${checked ? 'translate-x-4' : 'translate-x-0.5'}
                `} />
            </div>
        </button>
    );
}

const RequirementsSection: React.FC<RequirementsSectionProps> = ({ listing }) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);

    const [payerBadgePreferred, setPayerBadgePreferred] = useState(false);
    const [guarantorPreferred, setGuarantorPreferred] = useState(false);
    const [petsWelcome, setPetsWelcome] = useState(true);
    const [studentsWelcome, setStudentsWelcome] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch(`/api/listings/${listing.id}/requirements`);
                if (!res.ok) { setIsFetching(false); return; }
                const data = await res.json();
                if (data) {
                    setPayerBadgePreferred(data.payerBadgePreferred ?? false);
                    setGuarantorPreferred(data.guarantorPreferred ?? false);
                    setPetsWelcome(data.petsWelcome ?? true);
                    setStudentsWelcome(data.studentsWelcome ?? true);
                }
            } catch { /* no requirements yet */ }
            setIsFetching(false);
        }
        load();
    }, [listing.id]);

    const handleSave = useCallback(async () => {
        setIsLoading(true);
        try {
            await axios.put(`/api/listings/${listing.id}/requirements`, {
                payerBadgePreferred,
                guarantorPreferred,
                petsWelcome,
                studentsWelcome,
            });
            toast.custom((t) => (
                <CustomToast t={t} message="Préférences mises à jour" type="success" />
            ));
            router.refresh();
        } catch (error) {
            console.error('Failed to save requirements:', error);
            toast.custom((t) => (
                <CustomToast t={t} message="Erreur lors de la sauvegarde" type="error" />
            ));
        } finally {
            setIsLoading(false);
        }
    }, [listing.id, payerBadgePreferred, guarantorPreferred, petsWelcome, studentsWelcome, router]);

    if (isFetching) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-neutral-300 border-t-black dark:border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 pb-24 md:pb-8">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
                <Info size={18} className="text-neutral-500 shrink-0 mt-0.5" />
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Ces préférences sont affichées sur votre annonce. Elles sont informatives — aucun candidat n&apos;est bloqué.
                </p>
            </div>

            {/* Profil recherché */}
            <div>
                <h3 className="text-base font-semibold mb-3">Profil recherché</h3>
                <div className="flex flex-col gap-3">
                    <ToggleSwitch
                        checked={payerBadgePreferred}
                        onChange={setPayerBadgePreferred}
                        label="Badge Payeur Vérifié souhaité"
                        subtitle="Les candidats ayant vérifié leur historique de paiement via Coridor"
                        icon={BadgeCheck}
                    />
                    <ToggleSwitch
                        checked={guarantorPreferred}
                        onChange={setGuarantorPreferred}
                        label="Garant souhaité"
                        icon={Shield}
                    />
                </div>
            </div>

            {/* Propriétaire accueillant */}
            <div>
                <h3 className="text-base font-semibold mb-3">Propriétaire accueillant</h3>
                <div className="flex flex-col gap-3">
                    <ToggleSwitch
                        checked={petsWelcome}
                        onChange={setPetsWelcome}
                        label="Animaux bienvenus"
                        icon={PawPrint}
                    />
                    <ToggleSwitch
                        checked={studentsWelcome}
                        onChange={setStudentsWelcome}
                        label="Étudiants bienvenus"
                        icon={GraduationCap}
                    />
                </div>
            </div>

            <EditSectionFooter
                onClick={handleSave}
                disabled={isLoading}
                label={isLoading ? 'Enregistrement...' : 'Enregistrer les préférences'}
            />
        </div>
    );
};

export default RequirementsSection;
