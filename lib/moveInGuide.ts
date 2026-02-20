// ---- Guide d'emménagement post-signature ----
// Types, constantes et configuration des 8 étapes + 10 stories

export const MOVE_IN_STEP_IDS = [
  'assurance',
  'energie',
  'internet',
  'apl',
  'adresse',
  'etat-des-lieux',
  'quartier',
  'carte-grise',
] as const;

export type MoveInStepId = typeof MOVE_IN_STEP_IDS[number];

export interface MoveInStep {
  id: MoveInStepId;
  completed: boolean;
  completedAt?: string;
}

export const DEFAULT_MOVE_IN_STEPS: MoveInStep[] = MOVE_IN_STEP_IDS.map(id => ({
  id,
  completed: false,
}));

export type MoveInStepPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface MoveInStepConfig {
  id: MoveInStepId;
  emoji: string;
  title: string;
  headline: string;
  tag: string;
  priority: MoveInStepPriority;
  description: string;
  tips: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  color: string;
  colorLight: string;
  colorBorder: string;
  background: string;
}

export const PRIORITY_LABELS: Record<MoveInStepPriority, string> = {
  urgent: 'Urgent',
  high: 'Important',
  medium: 'Recommandé',
  low: 'Optionnel',
};

export const PRIORITY_COLORS: Record<MoveInStepPriority, { text: string; bg: string; border: string }> = {
  urgent: { text: '#D94040', bg: '#FFF0F0', border: 'rgba(217,64,64,0.15)' },
  high: { text: '#C88A20', bg: '#FFF6E8', border: 'rgba(232,168,56,0.15)' },
  medium: { text: '#3B7FD9', bg: '#EEF4FF', border: 'rgba(59,127,217,0.12)' },
  low: { text: 'rgba(0,0,0,0.4)', bg: '#F5F5F7', border: 'rgba(0,0,0,0.06)' },
};

export const MOVE_IN_STEPS_CONFIG: MoveInStepConfig[] = [
  {
    id: 'assurance',
    emoji: '🛡️',
    title: 'Assurance habitation',
    headline: 'Assurance\nhabitation',
    tag: 'Obligatoire · Sous 30 jours',
    priority: 'urgent',
    description: "Obligatoire avant l'entrée dans les lieux. Votre propriétaire vous demandera l'attestation.",
    tips: [
      'Multirisque habitation recommandée (responsabilité civile + biens personnels)',
      'Comparez sur LeLynx, Assurland, ou via votre banque',
      'Budget moyen : 15-25€/mois pour un appartement',
      'Attestation à fournir au bailleur sous 30 jours max',
    ],
    ctaLabel: 'Comparer les assurances',
    color: '#D94040',
    colorLight: '#FFF0F0',
    colorBorder: 'rgba(217,64,64,0.12)',
    background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF5F5 50%, #FFFFFF 100%)',
  },
  {
    id: 'energie',
    emoji: '⚡',
    title: 'Électricité & gaz',
    headline: 'Électricité\n& gaz',
    tag: 'Important · Avant emménagement',
    priority: 'high',
    description: "Ouvrez vos compteurs pour avoir l'énergie dès le jour J. Relevez les index à l'état des lieux.",
    tips: [
      "Relevez les compteurs (électricité ET gaz) le jour de l'état des lieux",
      'Mise en service EDF : ~5 jours ouvrés, express possible',
      'Comparez : EDF, Engie, TotalEnergies, Ekwateur...',
      'Linky = mise en service à distance possible',
    ],
    ctaLabel: 'Ouvrir mes compteurs',
    color: '#2D9F4F',
    colorLight: '#EEFAF1',
    colorBorder: 'rgba(45,159,79,0.12)',
    background: 'linear-gradient(180deg, #FFFFFF 0%, #F0FAF3 50%, #FFFFFF 100%)',
  },
  {
    id: 'internet',
    emoji: '📡',
    title: 'Internet & box',
    headline: 'Internet\n& box',
    tag: 'Important · 2 semaines avant',
    priority: 'high',
    description: "Anticipez ! Le raccordement peut prendre 2 semaines. Vérifiez l'éligibilité fibre de votre adresse.",
    tips: [
      'Test éligibilité : ariase.com ou degrouptest.com',
      'Délai raccordement fibre : 2-3 semaines',
      'Prévenez votre FAI actuel pour résiliation ou transfert',
      'Demandez au proprio si une prise optique existe',
    ],
    ctaLabel: 'Tester mon éligibilité fibre',
    ctaUrl: 'https://www.ariase.com/box/test-eligibilite',
    color: '#3B7FD9',
    colorLight: '#EEF4FF',
    colorBorder: 'rgba(59,127,217,0.12)',
    background: 'linear-gradient(180deg, #FFFFFF 0%, #F0F5FF 50%, #FFFFFF 100%)',
  },
  {
    id: 'apl',
    emoji: '💰',
    title: "Demande d'APL",
    headline: "Demande\nd'APL",
    tag: 'Si éligible · Dès la signature',
    priority: 'medium',
    description: 'Faites votre demande dès maintenant — le traitement prend plusieurs semaines.',
    tips: [
      'Simulez vos droits sur caf.fr avant de faire la demande',
      'Documents : bail signé, RIB, ressources 12 derniers mois',
      'Délai moyen de traitement : 1 à 2 mois',
      "L'APL n'est pas rétroactive — chaque jour de retard = argent perdu",
    ],
    ctaLabel: 'Simuler mes droits APL',
    ctaUrl: 'https://www.caf.fr/allocataires/mes-services-en-ligne/faire-une-simulation',
    color: '#E8A838',
    colorLight: '#FFF6E8',
    colorBorder: 'rgba(232,168,56,0.15)',
    background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF9F0 50%, #FFFFFF 100%)',
  },
  {
    id: 'adresse',
    emoji: '📬',
    title: "Changement d'adresse",
    headline: "Changement\nd'adresse",
    tag: 'Pratique · Premières semaines',
    priority: 'medium',
    description: "Prévenez tout le monde d'un coup sur service-public.fr. Pensez à la réexpédition du courrier.",
    tips: [
      'service-public.fr → "Je déménage" (prévient CAF, impôts, CPAM en une fois)',
      'Réexpédition La Poste : ~30€/6 mois (recommandé)',
      'Banque, mutuelle, employeur, assurance auto à prévenir manuellement',
    ],
    ctaLabel: "Faire mon changement d'adresse",
    ctaUrl: 'https://www.service-public.fr/particuliers/vosdroits/R11193',
    color: '#7B5CB8',
    colorLight: '#F3EEFF',
    colorBorder: 'rgba(123,92,184,0.12)',
    background: 'linear-gradient(180deg, #FFFFFF 0%, #F5F0FF 50%, #FFFFFF 100%)',
  },
  {
    id: 'etat-des-lieux',
    emoji: '📋',
    title: 'État des lieux',
    headline: 'État des\nlieux',
    tag: 'Le jour J · Avec le propriétaire',
    priority: 'high',
    description: "Soyez minutieux — photographiez tout. C'est votre protection pour le dépôt de garantie.",
    tips: [
      'Photographiez chaque pièce (murs, sols, plafonds, équipements)',
      'Notez la moindre rayure, tache, fissure — même minime',
      "Testez robinets, prises, volets, interrupteurs, chasse d'eau",
      '10 jours après pour signaler un oubli (par LRAR)',
    ],
    color: '#2D9F4F',
    colorLight: '#EEFAF1',
    colorBorder: 'rgba(45,159,79,0.12)',
    background: 'linear-gradient(180deg, #FFFFFF 0%, #F0FAF3 50%, #FFFFFF 100%)',
  },
  {
    id: 'quartier',
    emoji: '🏘️',
    title: 'Infos quartier',
    headline: 'Infos\nquartier',
    tag: 'Bonus · Votre nouveau quartier',
    priority: 'low',
    description: 'Découvrez votre nouveau quartier : transports, commerces, médecins et services à proximité.',
    tips: [
      'Stations de métro & bus les plus proches',
      'Supermarchés & commerces essentiels',
      'Médecins, pharmacies, urgences',
      'Mairie, poste, déchetterie',
    ],
    ctaLabel: 'Explorer mon quartier',
    // ctaUrl construit dynamiquement avec l'adresse du bail → Google Maps
    color: '#2BA89E',
    colorLight: '#E8F8F7',
    colorBorder: 'rgba(43,168,158,0.12)',
    background: 'linear-gradient(180deg, #FFFFFF 0%, #F0FAFA 50%, #FFFFFF 100%)',
  },
  {
    id: 'carte-grise',
    emoji: '🚗',
    title: 'Carte grise & listes électorales',
    headline: 'Carte grise\n& listes électorales',
    tag: 'Si concerné · Sous 1 mois',
    priority: 'low',
    description: "Mettez à jour l'adresse de votre carte grise sous 1 mois. Pensez aux listes électorales.",
    tips: [
      'Carte grise : ants.gouv.fr (gratuit, 100% en ligne)',
      'Délai légal : 1 mois (amende possible si oubli)',
      'Listes électorales : mairie ou service-public.fr',
      'Passeport/CNI : modification non obligatoire',
    ],
    ctaLabel: 'Modifier ma carte grise',
    ctaUrl: 'https://ants.gouv.fr/',
    color: 'rgba(0,0,0,0.4)',
    colorLight: '#F5F5F7',
    colorBorder: 'rgba(0,0,0,0.06)',
    background: 'linear-gradient(180deg, #FFFFFF 0%, #F8F8F8 50%, #FFFFFF 100%)',
  },
];

// Backgrounds pour stories spéciales (congrats + recap)
export const STORY_SPECIAL_BACKGROUND = 'linear-gradient(160deg, #FFF9F0 0%, #FFFFFF 50%, #F0F7FF 100%)';

// Données pour la story 1 (Congrats)
export interface MoveInLeaseData {
  applicationId: string;
  propertyAddress: string;
  propertyType: string;
  propertySurface: number;
  rentAmount: number;
  startDate: string;
}

// Helper pour calculer la progression
export function getCompletedCount(steps: MoveInStep[]): number {
  return steps.filter(s => s.completed).length;
}
