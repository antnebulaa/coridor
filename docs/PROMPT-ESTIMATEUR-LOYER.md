# Prompt d'implémentation — Estimateur de Loyer

## Contexte

Quand un propriétaire crée ou modifie son annonce sur Coridor, il doit fixer un loyer. Aujourd'hui il n'a aucune aide — il met un chiffre au hasard ou regarde les annonces autour de lui. L'estimateur de loyer lui donne une **fourchette précise** basée sur les données de marché, ajustée aux caractéristiques de son bien, et intégrée avec le détecteur de zone tendue existant pour afficher le plafond légal quand applicable.

**Sources de données (gratuites, open data) :**
- **Carte des loyers ANIL 2025** (data.gouv.fr) — 9,1 millions d'annonces SeLoger + LeBonCoin, loyer/m² par commune, segmenté par type et typologie
- **Encadrement des loyers Paris** (opendata.paris.fr) — loyer de référence par quartier, nb pièces, époque de construction, meublé/nu
- **Encadrement des loyers autres villes** — Lyon, Lille, Montpellier, Bordeaux, Grenoble (datasets similaires, open data)
- **Observatoires Locaux des Loyers (OLL)** — 60 agglomérations, données CSV sur data.gouv.fr

## Ce qui existe DÉJÀ

### Détecteur de zone tendue
Vérifier dans le code existant le service/composant qui détecte si une commune est en zone tendue et affiche le loyer max autorisé. Il est probable que :
- Un service `ZoneTendueService` ou équivalent existe
- Les données de zonage (zone A, Abis, B1, B2, C) sont déjà en DB ou en fichier JSON
- L'encadrement des loyers Paris est peut-être déjà partiellement implémenté

**AVANT DE CODER** : auditer le code existant pour le détecteur de zone tendue. Chercher dans :
- `services/` — tout fichier contenant "zone", "tendue", "encadrement", "loyer"
- `lib/` — idem
- `prisma/schema.prisma` — champs liés au zonage sur Property/Listing
- `components/` — composants d'alerte zone tendue

L'estimateur doit **s'intégrer avec** le détecteur existant, pas le remplacer.

### Données du bien déjà saisies
Le proprio a déjà rempli lors de la création de l'annonce :
- Adresse complète (ville, code postal, coordonnées GPS potentiellement)
- Type de bien (appartement/maison)
- Surface (m²)
- Nombre de pièces
- Nombre de chambres
- Meublé ou nu
- Époque de construction (peut-être, vérifier)

Ces données sont disponibles dans le model `Listing` ou `Property` du schema Prisma.

---

## Ce qu'il faut construire

### Vue d'ensemble

```
┌─────────────────────────────────────────────┐
│ Page création/édition annonce (existante)    │
│                                             │
│  Étape "Loyer" ← C'EST ICI                 │
│                                             │
│  ┌─ Estimation Coridor ─────────────────┐  │
│  │                                       │  │
│  │  Loyer estimé : 1 050 — 1 250 €/mois │  │
│  │  ████████████████░░░░                 │  │
│  │  bas    médian    haut                │  │
│  │         1 150 €                       │  │
│  │                                       │  │
│  │  Basé sur : T3, 65m², Paris 11e,     │  │
│  │  non meublé, avant 1946              │  │
│  │                                       │  │
│  │  ⚠️ ZONE ENCADRÉE                    │  │
│  │  Loyer de référence majoré : 23,5€/m² │  │
│  │  → Plafond : 1 527 €/mois            │  │
│  │  Votre estimation est sous le plafond ✓│  │
│  │                                       │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  Loyer mensuel :  [1 150] €                │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Sprint 1 — Import et stockage des données open data

### 1a. Téléchargement et parsing des données ANIL

Les données de la Carte des loyers ANIL 2025 sont sur data.gouv.fr en CSV. Il faut les importer en DB.

**URL du dataset** : `https://www.data.gouv.fr/fr/datasets/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025/`

Télécharger le CSV et analyser sa structure. Les colonnes attendues (basé sur les versions précédentes) :
- `CODGEO` : code commune INSEE
- `LIBGEO` : nom de la commune
- Type de bien : appartement / maison
- Typologie : T1-T2 / T3+
- `loypredm2` : loyer médian prédit au m² (charges comprises)
- `Q1predm2` : 1er quartile (loyer bas)
- `Q3predm2` : 3e quartile (loyer haut)
- `nbobs` : nombre d'observations
- `R2` : coefficient de détermination (fiabilité)
- `lwr_IPpredm2` : borne basse intervalle de prédiction
- `upr_IPpredm2` : borne haute intervalle de prédiction

**Script d'import** : `scripts/import-rent-data.ts`

```typescript
// 1. Télécharge le CSV depuis data.gouv.fr
// 2. Parse le CSV
// 3. Pour chaque ligne, upsert dans la table RentMarketData
// 4. Log le nombre de lignes importées
// À exécuter manuellement 1x/an quand l'ANIL publie de nouvelles données
```

### 1b. Schema Prisma — Données de marché

```prisma
model RentMarketData {
  id                String    @id @default(uuid())
  
  // Identifiant commune
  communeCode       String    // Code INSEE (ex: "75111" pour Paris 11e)
  communeName       String    // Nom commune
  departement       String    // Code département (ex: "75")
  
  // Type et typologie
  propertyType      String    // "apartment" | "house"
  typology          String    // "all" | "t1_t2" | "t3_plus"
  
  // Indicateurs de loyer (€/m², charges comprises, non meublé)
  medianRentPerSqm  Float     // Loyer médian au m²
  q1RentPerSqm      Float     // 1er quartile (25e percentile)
  q3RentPerSqm      Float     // 3e quartile (75e percentile)
  lowerBound        Float?    // Borne basse intervalle de prédiction
  upperBound        Float?    // Borne haute intervalle de prédiction
  
  // Qualité des données
  observations      Int       // Nombre d'annonces analysées
  r2                Float?    // Coefficient de détermination (fiabilité)
  
  // Méta
  source            String    @default("ANIL_2025") // "ANIL_2025", "OLL_2024", etc.
  dataYear          Int       // Année des données
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  @@unique([communeCode, propertyType, typology, source])
  @@index([communeCode])
  @@index([departement])
}
```

### 1c. Schema Prisma — Encadrement des loyers (zones encadrées)

```prisma
model RentCapData {
  id                    String    @id @default(uuid())
  
  // Localisation
  city                  String    // "paris", "lyon", "lille", "montpellier", "bordeaux", "grenoble"
  zone                  String    // Quartier ou zone (ex: "Quartier Saint-Ambroise" pour Paris)
  zoneCode              String?   // Code zone si applicable
  
  // Critères de segmentation
  rooms                 Int       // Nombre de pièces (1, 2, 3, 4+)
  constructionEra       String    // Époque de construction (ex: "avant 1946", "1946-1970", "1971-1990", "1991-2005", "après 2005")
  isFurnished           Boolean   // Meublé ou nu
  
  // Loyers de référence (€/m²)
  referenceRent         Float     // Loyer de référence
  referenceRentMax      Float     // Loyer de référence majoré (+20%)
  referenceRentMin      Float     // Loyer de référence minoré (-30%)
  
  // Méta
  effectiveDate         DateTime  // Date d'entrée en vigueur de l'arrêté
  source                String    // "DRIHL_PARIS_2025", "LYON_2025", etc.
  dataYear              Int
  
  // Géométrie (optionnel, pour matching précis par coordonnées GPS)
  geoJson               Json?     // GeoJSON du quartier/zone
  
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  
  @@unique([city, zone, rooms, constructionEra, isFurnished, dataYear])
  @@index([city])
  @@index([city, zone])
}
```

### 1d. Scripts d'import pour l'encadrement

Nouveau fichier : `scripts/import-rent-cap-paris.ts`

Import depuis l'API Paris Open Data :
```
https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/logement-encadrement-des-loyers/records
```

L'API retourne directement du JSON avec les champs : quartier, nb_pieces, epoque, meuble_txt, ref, ref_majore, ref_minore, annee.

Scripts similaires pour les autres villes :
- `scripts/import-rent-cap-lyon.ts` — depuis data.grandlyon.com
- `scripts/import-rent-cap-lille.ts` — depuis opendata.lillemetropole.fr
- `scripts/import-rent-cap-other.ts` — Montpellier, Bordeaux, Grenoble

Chaque script est un one-shot exécutable manuellement. Fréquence : 1x/an (les arrêtés changent chaque 1er juillet pour Paris).

---

## Sprint 2 — Service d'estimation (RentEstimatorService)

### 2a. Service principal

Nouveau fichier : `services/RentEstimatorService.ts`

```typescript
// === TYPES ===

interface RentEstimationInput {
  // Données du bien (proviennent du Listing/Property existant)
  communeCode: string;          // Code INSEE
  communeName: string;
  departement: string;
  propertyType: 'apartment' | 'house';
  surface: number;              // m²
  rooms: number;                // Nombre de pièces
  isFurnished: boolean;
  constructionYear?: number;    // Année de construction
  
  // Optionnel (pour affiner)
  floor?: number;               // Étage
  hasBalcony?: boolean;
  hasParking?: boolean;
  hasElevator?: boolean;
  energyClass?: string;         // DPE : A, B, C, D, E, F, G
  latitude?: number;
  longitude?: number;
}

interface RentEstimationResult {
  // Estimation du loyer mensuel (hors charges)
  estimatedRentLow: number;     // Fourchette basse
  estimatedRentMedian: number;  // Estimation centrale
  estimatedRentHigh: number;    // Fourchette haute
  
  // Prix au m²
  pricePerSqmLow: number;
  pricePerSqmMedian: number;
  pricePerSqmHigh: number;
  
  // Encadrement des loyers (si applicable)
  isRentControlled: boolean;    // Vrai si zone encadrée
  rentCap?: {
    referenceRent: number;      // Loyer de référence (€/m²)
    referenceRentMax: number;   // Loyer de référence majoré (€/m²)
    referenceRentMin: number;   // Loyer de référence minoré (€/m²)
    maxAllowedRent: number;     // Plafond en € (referenceRentMax × surface)
    source: string;             // "Arrêté préfectoral Paris 2025"
  };
  
  // Ajustements appliqués
  adjustments: RentAdjustment[];
  
  // Qualité de l'estimation
  confidence: 'high' | 'medium' | 'low';
  confidenceReason: string;     // "Basé sur 450 annonces dans votre commune"
  dataSource: string;           // "ANIL 2025 — SeLoger + LeBonCoin"
  observations: number;         // Nombre d'annonces sous-jacentes
}

interface RentAdjustment {
  label: string;                // "Meublé", "DPE F/G", "Étage élevé"
  factor: number;               // Multiplicateur (ex: 1.15 pour +15%)
  impact: number;               // Impact en € sur le loyer mensuel
  reason: string;               // Explication
}

// === SERVICE ===

export class RentEstimatorService {

  /**
   * Estimation complète du loyer. Point d'entrée principal.
   * 
   * Algorithme :
   * 1. Cherche les données ANIL pour la commune + type + typologie
   * 2. Calcule le loyer de base : médian/m² × surface
   * 3. Applique les ajustements (meublé, DPE, caractéristiques)
   * 4. Si zone encadrée : récupère le plafond légal
   * 5. Retourne fourchette + plafond
   */
  static async estimate(input: RentEstimationInput): Promise<RentEstimationResult>

  /**
   * Récupère les données de marché ANIL pour une commune.
   * 
   * Logique de fallback :
   * 1. Cherche par communeCode exact + propertyType + typology correspondante
   * 2. Si pas trouvé avec la typo exacte → cherche avec typology "all"
   * 3. Si pas trouvé du tout → cherche par département (moyenne)
   * 4. Si toujours rien → retourne null (confidence = low)
   */
  static async getMarketData(
    communeCode: string, 
    propertyType: string, 
    rooms: number
  ): Promise<RentMarketData | null>

  /**
   * Détermine la typologie ANIL à partir du nombre de pièces.
   * 1-2 pièces → "t1_t2"
   * 3+ pièces → "t3_plus"
   */
  static getTypology(rooms: number): string

  /**
   * Calcule les ajustements au loyer de base.
   * 
   * Ajustements supportés :
   * 
   * - MEUBLÉ : +10% à +20% selon la ville
   *   Les données ANIL sont pour du non-meublé.
   *   Paris : +13% en moyenne (source OLL)
   *   Province : +10% à +15%
   * 
   * - DPE F/G : -5% à -15%
   *   Les passoires énergétiques se louent moins cher.
   *   Varie selon la zone climatique.
   *   En zone tendue : gel du loyer, pas d'augmentation possible.
   * 
   * - DPE A/B : +3% à +8%
   *   Les biens performants se louent légèrement plus cher.
   * 
   * - ÉTAGE ÉLEVÉ (sans ascenseur) : -3% à -5%
   *   5e étage sans ascenseur = décote.
   * 
   * - ÉTAGE ÉLEVÉ (avec ascenseur) : +2% à +5%
   *   Vue et luminosité.
   * 
   * - BALCON/TERRASSE : +3% à +5%
   *   Espace extérieur prisé post-Covid.
   * 
   * - PARKING : +30€ à +100€/mois (montant fixe, pas %)
   *   Dépend de la ville (Paris : 80-100€, province : 30-50€)
   * 
   * Les pourcentages sont des estimations conservatrices basées 
   * sur les études OLL et les données de marché.
   */
  static calculateAdjustments(input: RentEstimationInput, baseRent: number): RentAdjustment[]

  /**
   * Vérifie si le bien est en zone d'encadrement des loyers
   * et retourne les plafonds.
   * 
   * S'intègre avec le détecteur de zone tendue EXISTANT.
   * 
   * Logique :
   * 1. Vérifie si la commune est dans les villes encadrées
   *    (Paris, Lyon, Villeurbanne, Lille, Hellemmes, Lomme, 
   *    Montpellier, Bordeaux, Grenoble, Est Ensemble, Plaine Commune,
   *    Grand Orly Seine Bièvre, Grigny)
   * 2. Si oui, cherche dans RentCapData avec :
   *    - city + zone (quartier, à déterminer par géocodage ou saisie)
   *    - rooms (cappé à 4+ pour les grands logements)
   *    - constructionEra (mappé depuis constructionYear)
   *    - isFurnished
   * 3. Retourne référence, majoré, minoré
   */
  static async getRentCap(input: RentEstimationInput): Promise<RentCapResult | null>

  /**
   * Mapping année de construction → époque pour l'encadrement.
   * "avant 1946" | "1946-1970" | "1971-1990" | "1991-2005" | "après 2005"
   */
  static getConstructionEra(year: number): string

  /**
   * Évalue la confiance de l'estimation.
   * - HIGH : >100 observations, R² > 0.7
   * - MEDIUM : 30-100 observations, R² > 0.5
   * - LOW : <30 observations ou R² < 0.5 ou fallback département
   */
  static evaluateConfidence(data: RentMarketData | null, fallbackUsed: boolean): ConfidenceLevel
}
```

### 2b. Constantes d'ajustement

Nouveau fichier : `lib/rentEstimatorConstants.ts`

```typescript
export const RENT_ADJUSTMENTS = {
  // Meublé (les données ANIL sont non-meublé)
  furnished: {
    paris: 1.13,        // +13% (source OLL Paris)
    lyon: 1.12,         // +12%
    default: 1.10,      // +10% ailleurs
  },
  
  // DPE
  dpe: {
    A: 1.05,            // +5%
    B: 1.03,            // +3%
    C: 1.00,            // référence
    D: 0.98,            // -2%
    E: 0.95,            // -5%
    F: 0.90,            // -10% (passoire)
    G: 0.85,            // -15% (passoire)
  },
  
  // Étage (sans ascenseur)
  floorNoElevator: {
    1: 1.00,
    2: 1.00,
    3: 0.98,
    4: 0.96,
    5: 0.94,            // -6% au 5e sans ascenseur
    '6+': 0.92,
  },
  
  // Étage (avec ascenseur)
  floorWithElevator: {
    1: 0.98,            // RDC / 1er légèrement moins
    2: 1.00,
    3: 1.01,
    4: 1.02,
    5: 1.03,
    '6+': 1.05,         // +5% étage élevé avec ascenseur (vue)
  },
  
  // Balcon/terrasse
  balcony: 1.04,        // +4%
  
  // Parking (montant fixe en €/mois)
  parking: {
    paris: 90,
    lyon: 60,
    default: 40,
  },
} as const;

// Villes avec encadrement des loyers (au 1er fev 2026)
export const RENT_CONTROLLED_CITIES = [
  'paris',
  'lyon', 'villeurbanne',
  'lille', 'hellemmes', 'lomme',
  'montpellier',
  'bordeaux',
  'grenoble',
  // EPT Île-de-France
  'aubervilliers', 'bagnolet', 'bobigny', 'bondy', 'le-pre-saint-gervais',
  'les-lilas', 'montreuil', 'noisy-le-sec', 'pantin', 'romainville', // Est Ensemble
  'epinay-sur-seine', 'l-ile-saint-denis', 'la-courneuve', 'pierrefitte-sur-seine',
  'saint-denis', 'saint-ouen-sur-seine', 'stains', 'villetaneuse', // Plaine Commune
  // ... compléter avec les communes des EPT
] as const;
```

### 2c. API Route

Nouveau fichier : `app/api/rent-estimate/route.ts`

```
POST /api/rent-estimate
  Body: RentEstimationInput
  → Retourne RentEstimationResult
  → Auth requise (le proprio doit être connecté pour voir l'estimation)
  → Utilisée par le formulaire de loyer dans la création d'annonce
```

### 2d. Hook client

Nouveau fichier : `hooks/useRentEstimate.ts`

```typescript
export function useRentEstimate(listingId: string) {
  // Récupère les données du bien depuis le Listing existant
  // Appelle POST /api/rent-estimate avec les données du bien
  // Retourne : estimation, isLoading, error, refetch
  // Se déclenche automatiquement quand les données du bien changent
  // (surface, pièces, meublé, adresse)
}
```

---

## Sprint 3 — Intégration UI

### 3a. Composant RentEstimator

Nouveau fichier : `components/rent/RentEstimator.tsx`

Widget intégré dans la page de création/édition d'annonce, section "Loyer".

```
┌─────────────────────────────────────────────────┐
│  💰 Estimation de loyer Coridor                  │
│                                                  │
│  Basé sur 380 annonces à Paris 11e (T3, 65m²)  │
│  Source : ANIL 2025 — SeLoger + LeBonCoin       │
│                                                  │
│     1 050 €     1 150 €      1 250 €            │
│      bas         médian        haut              │
│  ────●━━━━━━━━━━━●━━━━━━━━━━━●────              │
│                                                  │
│  Ajustements :                                   │
│  • Non meublé .............. inclus              │
│  • DPE C ................... ±0%                 │
│                                                  │
│  📊 Confiance : ●●●○ Bonne                      │
│     (380 observations, R² = 0.78)               │
│                                                  │
└─────────────────────────────────────────────────┘
```

Si le bien est en zone encadrée, ajouter un bloc en dessous :

```
┌─────────────────────────────────────────────────┐
│  ⚖️ Encadrement des loyers — Paris 11e          │
│                                                  │
│  Votre bien : T3, avant 1946, non meublé        │
│  Quartier : Saint-Ambroise                       │
│                                                  │
│  Loyer de référence :         21,5 €/m²          │
│  Loyer de référence majoré :  25,8 €/m²  ← MAX  │
│  Loyer de référence minoré :  15,1 €/m²          │
│                                                  │
│  → Plafond pour 65m² :        1 677 €/mois       │
│                                                  │
│  ✓ Votre estimation (1 150€) est sous le plafond │
│                                                  │
│  ⓘ Le loyer ne peut dépasser le loyer de         │
│    référence majoré sauf complément de loyer     │
│    justifié (localisation, confort particulier).  │
│                                                  │
│  Source : Arrêté préfectoral du 1er juillet 2025 │
└─────────────────────────────────────────────────┘
```

### 3b. Intégration dans le formulaire de loyer

Modifier la page existante de saisie du loyer dans l'édition d'annonce.

L'estimateur s'affiche **automatiquement** dès que les données nécessaires sont remplies (adresse, surface, nb pièces, meublé/nu). Pas de bouton "Estimer" — c'est calculé en temps réel.

Si le proprio saisit un loyer supérieur au plafond encadré :
- Afficher un **avertissement rouge** : "Votre loyer dépasse le loyer de référence majoré. Ce n'est autorisé qu'en cas de complément de loyer justifié."
- Ne PAS bloquer la saisie (le complément de loyer est légal)
- Proposer un lien vers l'explication légale du complément de loyer

Si le proprio saisit un loyer très au-dessus de la fourchette haute (même hors encadrement) :
- Afficher un **avertissement orange** : "Votre loyer est significativement au-dessus du marché. Cela pourrait allonger le délai de location."

Si le proprio saisit un loyer en dessous de la fourchette basse :
- Afficher un **info bleu** : "Votre loyer est en dessous du marché. Vous pourriez envisager un loyer plus élevé."

### 3c. Pré-remplissage intelligent

Quand l'estimateur a calculé le loyer médian :
- Si le champ loyer est vide → pré-remplir avec le loyer médian estimé
- Si le champ loyer est déjà rempli → ne pas écraser, juste afficher l'estimation à côté
- Bouton "Appliquer l'estimation" pour remplir le champ avec la valeur médiane

### 3d. Intégration avec le simulateur d'investissement

L'estimation de loyer est aussi utile dans le simulateur d'investissement (Sprint séparé). Ajouter un bouton dans le formulaire du simulateur :
- "Estimer le loyer" → ouvre une modale avec les champs adresse/surface/pièces
- Remplit automatiquement le champ "Loyer mensuel" du simulateur

---

## Sprint 4 — Qualité et edge cases

### 4a. Mapping commune → code INSEE

Le proprio saisit une adresse, pas un code INSEE. Il faut un mapping.

Option 1 (recommandée) : utiliser l'API Adresse du gouvernement (gratuite, pas d'auth) :
```
GET https://api-adresse.data.gouv.fr/search/?q=23+rue+Jacques+Ibert+Paris
```
Retourne `citycode` (= code INSEE) dans la réponse.

Option 2 : stocker un fichier JSON code postal → code INSEE (moins précis pour les communes fusionnées).

Le mapping doit être fait automatiquement quand le proprio saisit l'adresse de son bien. Si l'adresse est déjà géocodée dans le model Listing/Property, récupérer le code INSEE depuis là.

### 4b. Mapping adresse → quartier (pour l'encadrement)

Pour Paris, il faut savoir dans quel quartier administratif se trouve le bien pour trouver le bon loyer de référence. Deux approches :

Option 1 (simple) : le proprio sélectionne son quartier dans un dropdown après avoir saisi l'adresse parisienne (80 quartiers).

Option 2 (automatique) : utiliser les coordonnées GPS du bien et les GeoJSON des quartiers stockés dans `RentCapData.geoJson` pour déterminer le quartier automatiquement (point-in-polygon).

Commencer par l'option 1 pour le MVP, migrer vers l'option 2 plus tard.

### 4c. Gestion des données manquantes

Si la commune n'a pas de données ANIL :
- Fallback sur les communes voisines du même département
- Afficher un message : "Données limitées pour votre commune. Estimation basée sur le département."
- Confidence = "low"

Si le bien est dans une ville encadrée mais que le quartier n'est pas renseigné :
- Afficher le range des loyers de référence pour toute la ville
- Demander au proprio de préciser le quartier pour une estimation plus précise

### 4d. Mention légale obligatoire

L'ANIL demande la mention suivante pour toute réutilisation :
> « Estimations ANIL, à partir des données du Groupe SeLoger et de leboncoin »

Afficher cette mention en petit sous chaque estimation.

---

## Fichiers créés / modifiés

| Fichier | Action | Sprint |
|---------|--------|--------|
| `prisma/schema.prisma` | Modifier — RentMarketData, RentCapData | 1 |
| `scripts/import-rent-data.ts` | Créer — import CSV ANIL | 1 |
| `scripts/import-rent-cap-paris.ts` | Créer — import API Paris Open Data | 1 |
| `scripts/import-rent-cap-lyon.ts` | Créer — import Lyon | 1 |
| `scripts/import-rent-cap-lille.ts` | Créer — import Lille | 1 |
| `scripts/import-rent-cap-other.ts` | Créer — Montpellier, Bordeaux, Grenoble | 1 |
| `services/RentEstimatorService.ts` | Créer — moteur d'estimation | 2 |
| `lib/rentEstimatorConstants.ts` | Créer — constantes ajustements | 2 |
| `app/api/rent-estimate/route.ts` | Créer — POST estimation | 2 |
| `hooks/useRentEstimate.ts` | Créer — hook client | 2 |
| `components/rent/RentEstimator.tsx` | Créer — widget estimation | 3 |
| `components/rent/RentCapAlert.tsx` | Créer — alerte encadrement | 3 |
| Page édition annonce (section Loyer) | Modifier — intégrer RentEstimator | 3 |
| Page simulateur investissement | Modifier — bouton "Estimer le loyer" | 3 |

---

## Vérification

1. `npx prisma db push` — schema valide
2. `npm run build` — 0 erreurs TypeScript
3. `npx ts-node scripts/import-rent-data.ts` — import ANIL réussi, X milliers de lignes
4. `npx ts-node scripts/import-rent-cap-paris.ts` — import Paris réussi
5. Estimation pour un T3 65m² Paris 11e non meublé → fourchette 1000-1300€ (réaliste)
6. Estimation pour un T2 35m² Lyon 3e meublé → ajustement meublé visible (+12%)
7. Estimation pour une maison 90m² en zone rurale → confidence "low", fallback département
8. En zone encadrée : plafond affiché correctement
9. Loyer saisi > plafond encadré → avertissement rouge
10. Loyer saisi > fourchette haute → avertissement orange
11. Champ loyer vide → pré-rempli avec médian
12. Modification surface/pièces → estimation recalculée en temps réel
13. Mention ANIL visible sous chaque estimation
14. Intégration avec détecteur de zone tendue existant (pas de doublon)

## Règles absolues

1. **S'intégrer avec le détecteur de zone tendue existant** — ne pas recréer la détection, la compléter
2. Les données sont des **indicateurs**, pas des vérités absolues — toujours afficher la confiance et la source
3. **Ne jamais bloquer** la saisie du loyer — le proprio a le dernier mot
4. Les ajustements sont des **estimations conservatrices** — mieux vaut sous-estimer que sur-estimer
5. Mention **« Estimations ANIL, à partir des données du Groupe SeLoger et de leboncoin »** obligatoire
6. Les scripts d'import sont **manuels** (1x/an) — pas de fetch automatique en production
7. L'API Adresse du gouvernement est **gratuite et sans auth** — l'utiliser pour le géocodage
8. En zone encadrée, afficher les **3 loyers de référence** (minoré, référence, majoré) — pas juste le majoré
9. Les données ANIL sont **charges comprises et non meublé** — appliquer les ajustements en conséquence
10. L'estimateur doit fonctionner **sans données d'encadrement** (les données ANIL couvrent toute la France, l'encadrement seulement quelques villes)
