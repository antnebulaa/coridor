'use client';

import { PassportBadgeType } from '@/lib/passportCompletion';
import { Check } from 'lucide-react';

interface PassportBadgeProps {
    type: PassportBadgeType;
}

const BADGE_CONFIG: Record<PassportBadgeType, { label: string; color: string; bg: string }> = {
    VERIFIED_PAYER: {
        label: 'Payeur vérifié',
        color: '#3BA55D',
        bg: 'rgba(59,165,93,0.15)',
    },
    IDENTITY_VERIFIED: {
        label: 'Identité confirmée',
        color: '#4A8FE7',
        bg: 'rgba(74,143,231,0.15)',
    },
    HISTORY_2Y: {
        label: 'Historique 2+ ans',
        color: '#8B6CC1',
        bg: 'rgba(139,108,193,0.15)',
    },
    HISTORY_5Y: {
        label: 'Historique 5+ ans',
        color: '#8B6CC1',
        bg: 'rgba(139,108,193,0.15)',
    },
    LANDLORD_REFERENCE: {
        label: 'Référence bailleur',
        color: '#E8A838',
        bg: 'rgba(232,168,56,0.15)',
    },
    PROFESSIONAL_VERIFIED: {
        label: 'Profil pro complété',
        color: '#4A8FE7',
        bg: 'rgba(74,143,231,0.15)',
    },
};

const PassportBadge: React.FC<PassportBadgeProps> = ({ type }) => {
    const config = BADGE_CONFIG[type];

    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ color: config.color, backgroundColor: config.bg }}
        >
            <Check size={12} strokeWidth={3} />
            {config.label}
        </span>
    );
};

export default PassportBadge;
