// ---- État des Lieux (EDL) — Types, constantes et configuration ----

import type {
  InspectionType,
  InspectionStatus,
  InspectionRoomType,
  ElementCategory,
  ElementCondition,
  ElementEvolution,
  MeterType,
  PhotoType,
} from '@prisma/client';

// ─── DESIGN TOKENS (Dark theme pour lisibilité terrain) ───

export const EDL_COLORS = {
  bg: '#0A0A0A',
  card: '#141414',
  card2: '#1C1C1C',
  border: '#2A2A2A',
  text: '#F5F5F5',
  text2: '#9CA3AF',
  text3: '#6B7280',
  accent: '#1719FF',
  green: '#018900',
  blue: '#60A5FA',
  yellow: '#FBBF24',
  orange: '#FB923C',
  red: '#EF4444',
} as const;

// ─── CONDITIONS (5 niveaux + Absent) ───

export interface ConditionConfig {
  key: ElementCondition;
  label: string;
  color: string;
  shortLabel: string;
}

export const CONDITIONS: ConditionConfig[] = [
  { key: 'NEW', label: 'Neuf', shortLabel: 'Neuf', color: EDL_COLORS.green },
  { key: 'GOOD', label: 'Bon', shortLabel: 'Bon', color: EDL_COLORS.blue },
  { key: 'NORMAL_WEAR', label: 'Usure normale', shortLabel: 'Usure norm.', color: EDL_COLORS.yellow },
  { key: 'DEGRADED', label: 'Dégradé', shortLabel: 'Dégradé', color: EDL_COLORS.orange },
  { key: 'OUT_OF_SERVICE', label: 'Hors service', shortLabel: 'H.S.', color: EDL_COLORS.red },
];

export const CONDITION_MAP = Object.fromEntries(
  CONDITIONS.map((c) => [c.key, c])
) as Record<ElementCondition, ConditionConfig>;

// Conditions qui déclenchent le sous-flow dégradation
export const DEGRADATION_CONDITIONS: ElementCondition[] = ['DEGRADED', 'OUT_OF_SERVICE'];

// ─── TYPES DE DÉGRADATION ───

export const DEGRADATION_TYPES = [
  'Tache',
  'Rayure',
  'Trou',
  'Fissure',
  'Moisissure',
  'Écaillé',
  'Cassé',
  'Jauni',
  'Décollé',
  'Manquant',
] as const;

export type DegradationType = (typeof DEGRADATION_TYPES)[number];

// ─── NATURES DE REVÊTEMENT PAR SURFACE ───

export const SURFACE_NATURES: Record<'FLOOR' | 'WALL' | 'CEILING', string[]> = {
  FLOOR: ['Parquet massif', 'Parquet contrecollé', 'Parquet stratifié (clipsable)', 'Carrelage', 'Lino / Vinyle', 'Moquette', 'Béton ciré', 'Résine', 'Jonc de mer', 'Tomettes', 'Autre'],
  WALL: ['Peinture', 'Papier peint', 'Crépi / Enduit', 'Carrelage', 'Faïence', 'Lambris', 'Béton brut', 'Pierre apparente', 'Autre'],
  CEILING: ['Peinture', 'Lambris', 'Dalles / Faux plafond', 'Plâtre moulé', 'Béton brut', 'Autre'],
};

// ─── SURFACES (éléments structurels par pièce) ───

export const SURFACE_ELEMENTS: { category: 'FLOOR' | 'WALL' | 'CEILING'; name: string }[] = [
  { category: 'FLOOR', name: 'Sols' },
  { category: 'WALL', name: 'Murs' },
  { category: 'CEILING', name: 'Plafond' },
];

// ─── ÉQUIPEMENTS PAR TYPE DE PIÈCE ───

export const EQUIPMENTS_BY_ROOM: Record<InspectionRoomType, string[]> = {
  ENTRY: ["Porte d'entrée", 'Interphone', 'Prises', 'Interrupteurs'],
  HALLWAY: ['Prises', 'Interrupteurs', 'Placards'],
  LIVING: ['Fenêtre(s)', 'Volets', 'Radiateur', 'Prises', 'Interrupteurs'],
  BEDROOM: ['Fenêtre(s)', 'Volets', 'Radiateur', 'Placard', 'Prises'],
  KITCHEN: ['Évier', 'Robinet', 'Plaques', 'Hotte', 'Placards', 'VMC'],
  BATHROOM: ['Douche/Baignoire', 'Lavabo', 'Robinet', 'VMC', 'Joints', 'Miroir'],
  BATHROOM_WC: ['Douche/Baignoire', 'Lavabo', 'Robinet', 'Cuvette', "Chasse d'eau", 'VMC', 'Joints', 'Miroir'],
  WC: ['Cuvette', "Chasse d'eau", 'Lave-mains'],
  LAUNDRY: ['Prises', 'Robinet', 'Évacuation'],
  OFFICE: ['Fenêtre(s)', 'Prises', 'Interrupteurs'],
  DRESSING: ['Étagères', 'Penderie', 'Prises'],
  BALCONY: ['Garde-corps', 'Sol', 'Évacuation'],
  TERRACE: ['Garde-corps', 'Sol', 'Évacuation'],
  CELLAR: ['Porte', 'Éclairage', 'Prises'],
  PARKING: ['Porte/Portail', 'Éclairage'],
  GARAGE: ['Porte', 'Éclairage', 'Prises'],
  OTHER: ['Prises', 'Interrupteurs'],
};

// ─── TEMPLATES DE PIÈCES PAR TYPOLOGIE ───

export interface RoomTemplate {
  type: InspectionRoomType;
  name: string;
  icon: string;
}

export const ROOM_TYPE_CONFIG: Record<InspectionRoomType, { label: string; icon: string }> = {
  ENTRY: { label: 'Entrée', icon: '🚪' },
  HALLWAY: { label: 'Couloir', icon: '🚶' },
  LIVING: { label: 'Séjour', icon: '🛋️' },
  BEDROOM: { label: 'Chambre', icon: '🛏️' },
  KITCHEN: { label: 'Cuisine', icon: '🍳' },
  BATHROOM: { label: 'Salle de bain', icon: '🚿' },
  BATHROOM_WC: { label: 'Salle de bain + WC', icon: '🚿' },
  WC: { label: 'WC', icon: '🚽' },
  LAUNDRY: { label: 'Buanderie', icon: '🧺' },
  OFFICE: { label: 'Bureau', icon: '💻' },
  DRESSING: { label: 'Dressing', icon: '👔' },
  BALCONY: { label: 'Balcon', icon: '🌿' },
  TERRACE: { label: 'Terrasse', icon: '☀️' },
  CELLAR: { label: 'Cave', icon: '🏚️' },
  PARKING: { label: 'Parking', icon: '🅿️' },
  GARAGE: { label: 'Garage', icon: '🚗' },
  OTHER: { label: 'Autre', icon: '📦' },
};

const baseRooms = (bedrooms: number): RoomTemplate[] => {
  const rooms: RoomTemplate[] = [
    { type: 'ENTRY', name: 'Entrée', icon: '🚪' },
    { type: 'LIVING', name: 'Séjour', icon: '🛋️' },
  ];
  for (let i = 0; i < bedrooms; i++) {
    rooms.push({
      type: 'BEDROOM',
      name: bedrooms === 1 ? 'Chambre' : `Chambre ${i + 1}`,
      icon: '🛏️',
    });
  }
  rooms.push(
    { type: 'KITCHEN', name: 'Cuisine', icon: '🍳' },
    { type: 'BATHROOM', name: 'Salle de bain', icon: '🚿' },
    { type: 'WC', name: 'WC', icon: '🚽' }
  );
  return rooms;
};

export const ROOM_TEMPLATES: Record<string, RoomTemplate[]> = {
  STUDIO: [
    { type: 'ENTRY', name: 'Entrée', icon: '🚪' },
    { type: 'LIVING', name: 'Pièce principale', icon: '🛋️' },
    { type: 'KITCHEN', name: 'Cuisine', icon: '🍳' },
    { type: 'BATHROOM', name: 'Salle de bain', icon: '🚿' },
    { type: 'WC', name: 'WC', icon: '🚽' },
  ],
  T1: [
    { type: 'ENTRY', name: 'Entrée', icon: '🚪' },
    { type: 'LIVING', name: 'Séjour', icon: '🛋️' },
    { type: 'KITCHEN', name: 'Cuisine', icon: '🍳' },
    { type: 'BATHROOM', name: 'Salle de bain', icon: '🚿' },
    { type: 'WC', name: 'WC', icon: '🚽' },
  ],
  T2: baseRooms(1),
  T3: baseRooms(2),
  T4: baseRooms(3),
  T5: baseRooms(4),
  HOUSE: [
    { type: 'ENTRY', name: 'Entrée', icon: '🚪' },
    { type: 'LIVING', name: 'Séjour', icon: '🛋️' },
    { type: 'KITCHEN', name: 'Cuisine', icon: '🍳' },
    { type: 'BEDROOM', name: 'Chambre 1', icon: '🛏️' },
    { type: 'BEDROOM', name: 'Chambre 2', icon: '🛏️' },
    { type: 'BEDROOM', name: 'Chambre 3', icon: '🛏️' },
    { type: 'BATHROOM', name: 'Salle de bain', icon: '🚿' },
    { type: 'WC', name: 'WC', icon: '🚽' },
    { type: 'GARAGE', name: 'Garage', icon: '🚗' },
  ],
};

// Fallback: T2
export function getRoomTemplate(typology?: string): RoomTemplate[] {
  if (!typology) return ROOM_TEMPLATES['T2'];
  const key = typology.toUpperCase().replace(/\s/g, '');
  return ROOM_TEMPLATES[key] || ROOM_TEMPLATES['T2'];
}

// ─── TYPES DE CLÉS PAR DÉFAUT ───

export const DEFAULT_KEY_TYPES = [
  { type: 'Porte', icon: '🔑' },
  { type: 'BAL', icon: '📬' },
  { type: 'Cave', icon: '🏚️' },
  { type: 'Badge', icon: '💳' },
  { type: 'Télécommande', icon: '📡' },
  { type: 'Digicode', icon: '🔢' },
] as const;

// ─── WIZARD COMPTEURS ───

export interface MeterWizardStep {
  meterType: MeterType;
  field: 'meterNumber' | 'indexValue' | 'photo';
  label: string;
  hint?: string;
  icon: string;
  inputMode?: 'text' | 'numeric';
}

export const METER_WIZARD_STEPS: MeterWizardStep[] = [
  { meterType: 'ELECTRICITY', field: 'meterNumber', label: 'N° du compteur électricité', hint: 'Ex: PDL-4928103', icon: '⚡', inputMode: 'text' },
  { meterType: 'ELECTRICITY', field: 'indexValue', label: 'Index (kWh)', hint: 'Ex: 12345', icon: '⚡', inputMode: 'numeric' },
  { meterType: 'ELECTRICITY', field: 'photo', label: 'Photo du compteur électrique', icon: '⚡' },
  { meterType: 'WATER', field: 'meterNumber', label: "N° du compteur d'eau", hint: 'Ex: 1234567', icon: '💧', inputMode: 'text' },
  { meterType: 'WATER', field: 'indexValue', label: 'Index (m³)', hint: 'Ex: 567', icon: '💧', inputMode: 'numeric' },
  { meterType: 'WATER', field: 'photo', label: "Photo du compteur d'eau", icon: '💧' },
];

// ─── PHASES D'INSPECTION DE PIÈCE (State Machine) ───

export type RoomPhase =
  | 'OVERVIEW'
  | 'SURFACE_PHOTO'
  | 'SURFACE_QUALIFY'
  | 'DEGRAD_TYPE'
  | 'DEGRAD_CLOSEUP'
  | 'DEGRAD_AUDIO'
  | 'EQUIP'
  | 'OBS'
  | 'DONE';

// ─── BULLES IA CONTEXTUELLES ───

export const AI_TIPS: Record<string, string> = {
  HOME: "Assurez-vous que l'électricité fonctionne et que le logement est vide avant de commencer.",
  METERS: 'Photographiez les chiffres du compteur bien lisiblement. En cas de doute, prenez plusieurs photos.',
  KEYS: 'Posez toutes les clés séparées sur une surface claire pour la photo.',
  ROOMS_HUB: 'Commencez par la pièce où vous êtes. Pas besoin de suivre un ordre particulier.',
  ENTRY: "Vérifiez bien la porte d'entrée : serrure, poignée, seuil, interphone.",
  LIVING: 'Testez les volets, les fenêtres, les radiateurs et les prises.',
  KITCHEN: 'Testez : plaques, four, robinet, hotte, VMC. Ouvrez les placards.',
  BATHROOM: 'Vérifiez joints douche/baignoire, VMC, et écoulement du lavabo.',
  BATHROOM_WC: 'Vérifiez joints douche/baignoire, VMC, écoulement lavabo, et tirez la chasse.',
  BEDROOM: 'Testez volets et fenêtres. Ouvrez les placards.',
  WC: "Tirez la chasse, vérifiez l'écoulement.",
  RECAP: 'Vérifiez que tout est noté avant de passer à la signature.',
};

// ─── CHECKLIST ANTI-OUBLI (Récapitulatif) ───

export const ANTI_FORGET_CHECKLIST = [
  { id: 'smoke_detector', label: 'Détecteur de fumée', icon: '🔥' },
  { id: 'vmc', label: 'VMC / Ventilation', icon: '💨' },
  { id: 'joints', label: 'Joints (douche, baignoire, évier)', icon: '🚿' },
  { id: 'shutters', label: 'Volets (fonctionnement)', icon: '🪟' },
  { id: 'doorbell', label: 'Sonnette / Interphone', icon: '🔔' },
  { id: 'mailbox', label: 'Boîte aux lettres', icon: '📬' },
] as const;

// ─── ÉVOLUTION (pour le diff sortie) ───

export const EVOLUTION_CONFIG: Record<ElementEvolution, { label: string; color: string }> = {
  UNCHANGED: { label: 'Identique', color: EDL_COLORS.green },
  NORMAL_WEAR: { label: 'Usure naturelle', color: EDL_COLORS.yellow },
  DETERIORATION: { label: 'Dégradation', color: EDL_COLORS.red },
  IMPROVEMENT: { label: 'Amélioration', color: EDL_COLORS.blue },
};

// ─── HELPERS ───

/** Détermine la typologie du logement à partir du nombre de chambres (pour le template de pièces) */
export function getTypologyFromRooms(roomCount: number): string {
  if (roomCount <= 1) return 'STUDIO';
  if (roomCount === 2) return 'T1';
  return `T${roomCount - 1}`;
}

/** Labels français pour les types d'inspection */
export const INSPECTION_TYPE_LABELS: Record<InspectionType, string> = {
  ENTRY: "État des lieux d'entrée",
  EXIT: 'État des lieux de sortie',
};

/** Labels français pour les statuts */
export const INSPECTION_STATUS_LABELS: Record<InspectionStatus, string> = {
  DRAFT: 'Brouillon',
  PENDING_SIGNATURE: 'En attente de signature',
  SIGNED: 'Signé',
  LOCKED: 'Verrouillé',
  AMENDED: 'Rectifié',
};

/** Labels pour les types de compteurs */
export const METER_TYPE_LABELS: Record<MeterType, { label: string; icon: string; unit: string }> = {
  ELECTRICITY: { label: 'Électricité', icon: '⚡', unit: 'kWh' },
  WATER: { label: 'Eau', icon: '💧', unit: 'm³' },
  GAS: { label: 'Gaz', icon: '🔥', unit: 'm³' },
};
