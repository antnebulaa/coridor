// Progressive disclosure — Passport Locatif completion logic
// Distinct from PassportService.computeScore() which calculates the trust score (0-100).
// This computes a % of "profile completion" for the 4-state card UI.

export type PassportState = 'discovery' | 'in_progress' | 'advanced' | 'complete';

export type PassportBadgeType =
    | 'VERIFIED_PAYER'
    | 'IDENTITY_VERIFIED'
    | 'HISTORY_2Y'
    | 'HISTORY_5Y'
    | 'LANDLORD_REFERENCE'
    | 'PROFESSIONAL_VERIFIED';

export interface PassportStep {
    id: string;
    label: string;
    description: string;
    estimatedMinutes: number;
    href: string;
}

export interface PassportCompletionData {
    percent: number;            // 0-100
    state: PassportState;
    earnedBadges: PassportBadgeType[];
    nextStep: PassportStep | null;
    remainingSteps: PassportStep[];  // max 3
    overallScore: number | null;     // trust score (null if < 75% completion)
    percentileRank: number | null;   // null if not enough data
}

// Input shape — adapted to actual Prisma fields
export interface PassportCompletionInput {
    hasBankConnection: boolean;
    hasIdentityVerified: boolean;   // not yet implemented, always false
    rentalHistoryCount: number;
    landlordReferenceCount: number; // consented LandlordReview count
    hasProfessionalInfo: boolean;   // jobType + netSalary on TenantProfile
    hasProfilePhoto: boolean;       // User.image
    hasBio: boolean;                // TenantProfile.bio
    verifiedMonths: number;         // TenantProfile.verifiedMonths
    totalRentalMonths: number;      // sum of rental history durations
    overallScore: number | null;    // from PassportService.computeScore
    percentileRank: number | null;  // computed server-side
}

const CRITERIA = [
    { id: 'bank',         weight: 25, field: 'hasBankConnection' as const },
    { id: 'identity',     weight: 20, field: 'hasIdentityVerified' as const },
    { id: 'history',      weight: 20, field: 'rentalHistoryCount' as const },
    { id: 'reference',    weight: 15, field: 'landlordReferenceCount' as const },
    { id: 'professional', weight: 10, field: 'hasProfessionalInfo' as const },
    { id: 'photo',        weight: 5,  field: 'hasProfilePhoto' as const },
    { id: 'bio',          weight: 5,  field: 'hasBio' as const },
] as const;

const STEPS: PassportStep[] = [
    {
        id: 'bank',
        label: 'Connecter vos données bancaires',
        description: 'Prouvez votre régularité de paiement via Powens',
        estimatedMinutes: 3,
        href: '/account/passport',
    },
    {
        id: 'identity',
        label: 'Vérifier votre identité',
        description: 'Confirmez votre identité pour renforcer la confiance',
        estimatedMinutes: 5,
        href: '/account/passport',
    },
    {
        id: 'history',
        label: 'Ajouter votre historique locatif',
        description: 'Renseignez vos anciens logements',
        estimatedMinutes: 5,
        href: '/account/passport',
    },
    {
        id: 'reference',
        label: 'Obtenir une référence bailleur',
        description: 'Demandez un avis à votre ancien propriétaire',
        estimatedMinutes: 2,
        href: '/account/passport',
    },
    {
        id: 'professional',
        label: 'Compléter vos informations professionnelles',
        description: 'Renseignez votre situation et vos revenus',
        estimatedMinutes: 3,
        href: '/account/tenant-profile',
    },
    {
        id: 'photo',
        label: 'Ajouter une photo de profil',
        description: 'Les profils avec photo inspirent plus confiance',
        estimatedMinutes: 1,
        href: '/account/personal-info',
    },
    {
        id: 'bio',
        label: 'Écrire votre bio',
        description: 'Présentez-vous en quelques mots',
        estimatedMinutes: 2,
        href: '/account/tenant-profile',
    },
];

function isCriterionMet(input: PassportCompletionInput, field: typeof CRITERIA[number]['field']): boolean {
    switch (field) {
        case 'hasBankConnection': return input.hasBankConnection;
        case 'hasIdentityVerified': return input.hasIdentityVerified;
        case 'rentalHistoryCount': return input.rentalHistoryCount >= 1;
        case 'landlordReferenceCount': return input.landlordReferenceCount >= 1;
        case 'hasProfessionalInfo': return input.hasProfessionalInfo;
        case 'hasProfilePhoto': return input.hasProfilePhoto;
        case 'hasBio': return input.hasBio;
    }
}

export function computePassportCompletion(input: PassportCompletionInput): PassportCompletionData {
    // 1. Compute percentage
    const percent = CRITERIA.reduce(
        (sum, c) => sum + (isCriterionMet(input, c.field) ? c.weight : 0),
        0
    );

    // 2. Determine state
    const state: PassportState =
        percent === 0 ? 'discovery' :
        percent <= 40 ? 'in_progress' :
        percent <= 74 ? 'advanced' : 'complete';

    // 3. Compute earned badges
    const earnedBadges: PassportBadgeType[] = [];

    if (input.hasBankConnection && input.verifiedMonths >= 3) {
        earnedBadges.push('VERIFIED_PAYER');
    }
    if (input.hasIdentityVerified) {
        earnedBadges.push('IDENTITY_VERIFIED');
    }
    if (input.totalRentalMonths >= 24) {
        earnedBadges.push('HISTORY_2Y');
    }
    if (input.totalRentalMonths >= 60) {
        earnedBadges.push('HISTORY_5Y');
    }
    if (input.landlordReferenceCount >= 1) {
        earnedBadges.push('LANDLORD_REFERENCE');
    }
    if (input.hasProfessionalInfo) {
        earnedBadges.push('PROFESSIONAL_VERIFIED');
    }

    // 4. Compute remaining steps (uncompleted criteria, in priority order)
    const completedIds = new Set<string>();
    for (const c of CRITERIA) {
        if (isCriterionMet(input, c.field)) {
            completedIds.add(c.id);
        }
    }

    const remaining = STEPS.filter(s => !completedIds.has(s.id)).slice(0, 3);
    const nextStep = remaining[0] || null;

    // 5. Overall score only shown at >= 75% completion
    const overallScore = state === 'complete' ? input.overallScore : null;
    const percentileRank = state === 'complete' ? input.percentileRank : null;

    return {
        percent,
        state,
        earnedBadges,
        nextStep,
        remainingSteps: remaining,
        overallScore,
        percentileRank,
    };
}
