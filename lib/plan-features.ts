export interface PlanFeature {
    label: string;
    includedIn: ('FREE' | 'PLUS' | 'PRO')[];
}

export interface PlanInfo {
    name: string;
    displayName: string;
    monthlyPrice: number;
    yearlyPrice: number;
    description: string;
    features: string[];        // Features included in this plan
    highlightFeatures: string[]; // Top 3-4 features for marketing/email
}

export const PLAN_INFO: Record<string, PlanInfo> = {
    FREE: {
        name: 'FREE',
        displayName: 'Gratuit',
        monthlyPrice: 0,
        yearlyPrice: 0,
        description: 'Pour découvrir Coridor',
        features: [
            '1 bien immobilier',
            'Candidats vérifiés & Bons payeurs',
            'Messagerie sécurisée',
            'Support par email',
            'Sauvegarde cloud',
        ],
        highlightFeatures: [
            '1 bien immobilier',
            'Candidats vérifiés',
            'Messagerie sécurisée',
        ],
    },
    PLUS: {
        name: 'PLUS',
        displayName: 'Plus',
        monthlyPrice: 19,
        yearlyPrice: 14,
        description: 'Pour les propriétaires exigeants',
        features: [
            '2 à 9 biens',
            'Candidats vérifiés & Bons payeurs',
            'Messagerie sécurisée',
            'Suivi des paiements (Powens)',
            'Relance auto & Quittances',
            'Révision des loyers',
            'Calcul régularisation des charges',
            'Gestion visites & Republication auto',
            'Génération de baux',
            'Rappels légaux',
            'Support prioritaire 7j/7',
            'Sauvegarde cloud',
        ],
        highlightFeatures: [
            'Suivi des paiements automatisé',
            'Génération de baux',
            'Gestion visites automatique',
            'Support prioritaire 7j/7',
        ],
    },
    PRO: {
        name: 'PRO',
        displayName: 'Pro',
        monthlyPrice: 99,
        yearlyPrice: 69,
        description: 'Pour les agences et équipes',
        features: [
            '10+ biens',
            'Tout du plan Plus',
            'Multi-utilisateurs & Équipes',
            'API & Export Comptable',
            'Account Manager dédié',
            'Rôles équipe',
        ],
        highlightFeatures: [
            'Gestion illimitée de biens',
            'Multi-utilisateurs & Équipes',
            'API & Export Comptable',
            'Account Manager dédié',
        ],
    },
};

// All features with which plans they're included in (for the comparison display)
export const ALL_FEATURES: PlanFeature[] = [
    { label: 'Candidats vérifiés & Bons payeurs', includedIn: ['FREE', 'PLUS', 'PRO'] },
    { label: 'Messagerie sécurisée', includedIn: ['FREE', 'PLUS', 'PRO'] },
    { label: 'Sauvegarde cloud', includedIn: ['FREE', 'PLUS', 'PRO'] },
    { label: 'Gestion automatisée des visites', includedIn: ['PLUS', 'PRO'] },
    { label: 'Republication auto (fin de bail)', includedIn: ['PLUS', 'PRO'] },
    { label: 'Génération de baux', includedIn: ['PLUS', 'PRO'] },
    { label: 'État des lieux numérique', includedIn: ['PLUS', 'PRO'] },
    { label: 'Révision loyer', includedIn: ['PLUS', 'PRO'] },
    { label: 'Rappels légaux & échéances', includedIn: ['PLUS', 'PRO'] },
    { label: 'Suivi des paiements automatisé', includedIn: ['PLUS', 'PRO'] },
    { label: 'Quittances automatiques', includedIn: ['PLUS', 'PRO'] },
    { label: 'Connexion bancaire (Powens)', includedIn: ['PLUS', 'PRO'] },
    { label: 'Relance impayés', includedIn: ['PLUS', 'PRO'] },
    { label: 'Export comptable', includedIn: ['PLUS', 'PRO'] },
    { label: 'Multi-utilisateurs & Équipes', includedIn: ['PRO'] },
    { label: 'API & Export Comptable', includedIn: ['PRO'] },
    { label: 'Account Manager dédié', includedIn: ['PRO'] },
    { label: 'Rôles équipe', includedIn: ['PRO'] },
];
