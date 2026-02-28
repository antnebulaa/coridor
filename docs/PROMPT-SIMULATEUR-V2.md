# Simulateur d'investissement locatif — V2 : Mise à niveau Horiz.io

## Contexte

Le simulateur V1 est fonctionnel (5 sprints livrés) mais incomplet par rapport au standard marché (Horiz.io). Cette V2 comble les manques identifiés :
- Formulaire trop simplifié (pas de séparation loyer/charges, pas de mobilier, pas d'apport, pas de GLI)
- Seulement 4 régimes fiscaux au lieu de ~12 pertinents
- Pas de revenus du foyer fiscal → impossible de calculer la TMI réelle
- Pas de vacance locative
- Estimateur de loyer ANIL pas connecté au simulateur

## Fichiers existants à connaître AVANT de coder

Lire impérativement :
- `services/InvestmentSimulatorService.ts` — moteur de calcul V1
- `lib/simulatorDefaults.ts` — constantes France 2026
- `app/[locale]/simulateur/SimulatorClient.tsx` — UI formulaire 4 étapes
- `components/simulator/*` — Form, Results, Chart
- `hooks/useInvestmentSimulator.ts` — hook client
- `services/TaxSimulatorService.ts` — service fiscal existant (4 régimes)
- `services/RentEstimatorService.ts` — estimateur de loyer ANIL
- `components/documents/InvestmentReportDocument.tsx` — PDF export

⚠️ NE PAS recréer ces fichiers. Les modifier et les enrichir.

---

## Sprint 1 — Enrichissement du formulaire

### 1a. Étape "Bien" — Ajouts

Champs existants à conserver : type de bien, surface, prix d'achat, frais de notaire, travaux.

**Nouveaux champs :**

```
Adresse du bien (optionnel)
├── Champ MapboxAddressSelect (composant existant)
├── Sert à : estimateur loyer ANIL + zone tendue + encadrement
└── Si renseigné → pré-remplit le loyer estimé (Sprint 3)

Prix du mobilier (si meublé)
├── Montant en €
├── Affiché uniquement si type = MEUBLE ou MEUBLE_TOURISME
├── Utilisé pour : amortissement mobilier LMNP/LMP au réel
├── Durée amortissement par défaut : 7 ans (configurable)
└── Champ optionnel, défaut 0€

Travaux — enrichissement
├── Montant existant → garder
├── AJOUTER : type de travaux (rénovation énergétique, aménagement, gros œuvre)
└── Utilisé pour : Denormandie (condition travaux ≥ 25% prix)
```

### 1b. Étape "Financement" — Ajouts

Champs existants à conserver : prix total, durée emprunt, taux intérêt, taux assurance.

**Nouveaux champs :**

```
Apport personnel
├── Montant en € OU sélection rapide :
│   ├── "0€ — Financement à 110%"
│   ├── "Frais de notaire uniquement" (auto-calculé)
│   ├── "10% du prix d'achat" (auto-calculé)
│   ├── "20% du prix d'achat" (auto-calculé)
│   └── "Montant personnalisé"
├── Impact : montant emprunté = prix total - apport
├── Impact TRI : l'apport est un flux négatif à t=0
└── Défaut : 0€

Garantie bancaire
├── Type : Crédit Logement / Hypothèque / PPD / Aucune
├── Coût estimé auto :
│   ├── Crédit Logement : ~1,2% du montant emprunté (avec restitution partielle à la fin)
│   ├── Hypothèque : ~1,5% du montant emprunté (taxe publicité foncière)
│   ├── PPD (Privilège Prêteur de Deniers) : ~0,7% du montant
│   └── Aucune : 0€
├── Modifiable manuellement
└── Ajouté aux frais d'acquisition (impacte rendement et TRI)

Frais de dossier bancaire
├── Montant en € (défaut : 1 000€)
└── Ajouté aux frais d'acquisition
```

### 1c. Étape "Locatif" — Refonte

**SÉPARER loyer et charges (le changement le plus important) :**

```
Loyer hors charges (HC)
├── Montant mensuel en €
├── Si adresse renseignée + estimateur ANIL → pré-rempli (Sprint 3)
└── C'est CE montant qui entre dans le calcul de rendement

Charges locatives (provisions)
├── Montant mensuel en €
├── Info : "Les provisions sur charges sont récupérables
│   auprès du locataire et ne comptent PAS dans le rendement"
└── Utilisé pour : affichage loyer CC, calcul régularisation

Charges annuelles propriétaire (NON récupérables)
├── Taxe foncière : €/an
├── Assurance PNO : €/an (défaut : 150€)
├── Charges de copropriété non récupérables : €/an
│   (info : "Part propriétaire uniquement, pas la part locataire")
├── Frais de gestion : €/an ou % du loyer
│   (0€ si gestion directe, 6-8% si agence)
├── Entretien courant / petites réparations : €/an (défaut : 300€)
└── Autres charges : €/an (champ libre)

GLI (Garantie Loyers Impayés)
├── Toggle : oui / non
├── Si oui : taux en % du loyer HC (défaut : 3,5%)
├── Calcul auto : montant annuel = loyer HC × 12 × taux
├── Charge déductible au réel
└── Impact : réduit le rendement net mais sécurise le cash-flow

Vacance locative
├── Nombre de semaines par an (défaut : 2)
├── OU taux en % (défaut : 4%)
├── Impact : réduit les revenus locatifs annuels
│   revenus_nets = loyer_HC × 12 × (1 - taux_vacance)
└── Info : "Période moyenne sans locataire entre deux baux"
```

### 1d. Étape "Fiscalité" — Refonte

**Revenus du foyer fiscal :**

```
Situation familiale
├── Célibataire / Marié-Pacsé / Divorcé / Veuf
└── Détermine le nombre de déclarants

Revenu net imposable — Déclarant 1
├── Montant annuel en €
└── Revenus hors revenus fonciers (salaire net imposable)

Revenu net imposable — Déclarant 2 (si couple)
├── Montant annuel en €
└── Affiché uniquement si Marié-Pacsé

Nombre de parts fiscales
├── Auto-calculé depuis la situation + enfants
├── OU saisie manuelle (toggle "Je connais mes parts")
├── Défaut : 1 (célibataire), 2 (couple)
└── Enfants : +0,5 par enfant (1-2), +1 à partir du 3e

TMI affichée (calculée automatiquement)
├── Tranche marginale d'imposition calculée
├── Barème 2026 (à mettre dans simulatorDefaults.ts)
│   ├── 0% : 0 → 11 497€
│   ├── 11% : 11 498 → 29 315€
│   ├── 30% : 29 316 → 83 823€
│   ├── 41% : 83 824 → 180 294€
│   └── 45% : > 180 294€
├── Prélèvements sociaux : 17,2% (fixe)
└── Info : "Votre TMI actuelle est de X%. Vos revenus fonciers
    seront imposés à ce taux (+ 17,2% de prélèvements sociaux)."

Régime fiscal (voir Sprint 2 pour les nouveaux régimes)
├── Sélection dans une dropdown groupée :
│   ├── LOCATION NUE
│   │   ├── Micro-foncier (revenus < 15 000€, abattement 30%)
│   │   └── Régime réel (déduction charges, déficit foncier)
│   ├── LOCATION MEUBLÉE
│   │   ├── LMNP micro-BIC (abattement 50%)
│   │   ├── LMNP réel (amortissement bien + mobilier)
│   │   └── LMP réel (revenus > 23k€ ou > 50% revenus foyer)
│   ├── SOCIÉTÉ
│   │   └── SCI/SARL à l'IS (impôt société 15% puis 25%)
│   ├── DISPOSITIFS DÉFISCALISATION
│   │   ├── Pinel 6 ans / 9 ans / 12 ans (bien neuf)
│   │   └── Denormandie 6 ans / 9 ans / 12 ans (ancien + travaux)
│   └── AUTO — Coridor compare et recommande le meilleur
├── Défaut : AUTO
└── En mode AUTO, l'onglet résultats montre la comparaison
    des régimes applicables avec le meilleur mis en valeur
```

### 1e. Mise à jour du type TypeScript

Modifier le type `SimulatorInputs` (ou équivalent) dans le service :

```typescript
interface SimulatorInputs {
  // Bien
  propertyType: 'APARTMENT' | 'HOUSE';
  rentalType: 'NU' | 'MEUBLE' | 'MEUBLE_TOURISME';
  surface: number;
  purchasePrice: number;
  notaryFees: number; // auto-calculé ou saisi
  renovationCost: number;
  renovationType?: 'ENERGY' | 'FITOUT' | 'STRUCTURAL';
  furnitureCost: number; // NOUVEAU — 0 si location nue
  furnitureAmortizationYears: number; // NOUVEAU — défaut 7
  address?: string; // NOUVEAU — optionnel, pour estimateur
  communeCode?: string; // NOUVEAU — code INSEE si adresse

  // Financement
  downPayment: number; // NOUVEAU
  loanAmount: number; // calculé = total - downPayment
  loanDurationYears: number;
  interestRate: number;
  insuranceRate: number;
  guaranteeType: 'CREDIT_LOGEMENT' | 'HYPOTHEQUE' | 'PPD' | 'NONE'; // NOUVEAU
  guaranteeCost: number; // NOUVEAU — auto-calculé ou saisi
  bankFees: number; // NOUVEAU — défaut 1000

  // Locatif
  monthlyRentHC: number; // RENOMMÉ — était "monthlyRent"
  monthlyChargesProvision: number; // NOUVEAU — charges récupérables
  annualPropertyTax: number; // RENOMMÉ — était dans "charges"
  annualInsurancePNO: number; // NOUVEAU — défaut 150
  annualCoproNonRecoverable: number; // NOUVEAU
  managementFeeRate: number; // NOUVEAU — 0 si autogestion, % si agence
  annualMaintenance: number; // NOUVEAU — défaut 300
  annualOtherCharges: number; // NOUVEAU
  hasGLI: boolean; // NOUVEAU
  gliRate: number; // NOUVEAU — défaut 3.5%
  vacancyWeeksPerYear: number; // NOUVEAU — défaut 2

  // Fiscalité
  familyStatus: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED'; // NOUVEAU
  annualIncomeDeclarant1: number; // NOUVEAU
  annualIncomeDeclarant2?: number; // NOUVEAU — si couple
  taxShares: number; // NOUVEAU — parts fiscales
  taxRegime: TaxRegime; // ENRICHI — voir Sprint 2
  
  // Projection
  projectionYears: number;
  annualRentIncrease: number;
  annualPropertyAppreciation: number;
  resaleYear?: number; // NOUVEAU — pour TRI personnalisé
  resalePrice?: number; // NOUVEAU — optionnel
}
```

---

## Sprint 2 — Nouveaux régimes fiscaux

### 2a. Enrichir TaxSimulatorService

Le service existant gère 4 régimes. Ajouter :

**LMP au réel (Loueur Meublé Professionnel)**
```
Conditions : revenus locatifs > 23 000€/an ET > 50% revenus foyer
Calcul identique LMNP réel MAIS :
- Charges sociales SSI ~35-45% du bénéfice (au lieu de PS 17,2%)
- Déficit imputable sur revenu global (pas limité aux BIC)
- Plus-value : régime pro (exonération si > 5 ans d'activité
  et recettes < 90 000€)
- Amortissement identique LMNP
⚠️ Alerte si les revenus locatifs simulés dépassent les seuils LMP
```

**SCI/SARL à l'IS**
```
Impôt société :
- 15% sur les premiers 42 500€ de bénéfice (taux réduit PME)
- 25% au-delà
Amortissement du bien (comme LMNP mais durées différentes) :
- Structure : 2% par an (50 ans)
- Toiture : 3% par an
- Installations : 5% par an
- Agencement : 7% par an
→ Simplification : amortissement moyen ~3% / an
Dividendes : flat tax 30% (12,8% IR + 17,2% PS) ou barème
Pas d'abattement pour durée de détention sur plus-value
(la PV est celle de la société, pas du particulier)
```

**Pinel (6/9/12 ans)**
```
Conditions : bien neuf ou VEFA, zone A/Abis/B1
Réduction d'impôt :
- 6 ans : 9% du prix (max 300 000€) = 1,5%/an
- 9 ans : 12% du prix = 1,33%/an
- 12 ans : 14% du prix = 1,17%/an + 1%/an années 10-12
Plafonds loyer par zone (à stocker dans simulatorDefaults.ts) :
- Zone A bis : 18,89€/m²
- Zone A : 14,03€/m²
- Zone B1 : 11,31€/m²
Plafonds revenus locataire (non simulé — mentionner en info)
Régime fiscal sous-jacent : réel foncier (déduction charges)
⚠️ Pinel en extinction fin 2024 → mentionner "baux existants uniquement"
```

**Denormandie (6/9/12 ans)**
```
Conditions : bien ancien + travaux ≥ 25% du coût total (achat + travaux)
Mêmes taux de réduction que Pinel
Zones : communes "Cœur de ville" ou "ORT"
Régime fiscal sous-jacent : réel foncier
Vérification auto : si renovationCost / (purchasePrice + renovationCost) < 25%
→ alerte "Les travaux doivent représenter au moins 25% du coût total"
```

### 2b. Structure du code

Nouveau fichier ou enrichissement : `services/tax-regimes/`
```
services/
├── TaxSimulatorService.ts (existant — à enrichir)
├── tax-regimes/
│   ├── MicroFoncier.ts
│   ├── ReelFoncier.ts
│   ├── MicroBIC.ts
│   ├── LMNPReel.ts
│   ├── LMPReel.ts (NOUVEAU)
│   ├── SCIIS.ts (NOUVEAU)
│   ├── Pinel.ts (NOUVEAU)
│   ├── Denormandie.ts (NOUVEAU)
│   └── index.ts (factory qui retourne le bon calculateur)
```

Chaque régime implémente une interface commune :

```typescript
interface TaxRegimeCalculator {
  id: TaxRegime;
  label: string;
  description: string;
  isApplicable(inputs: SimulatorInputs): boolean;
  // Retourne true si les conditions sont remplies
  
  calculateAnnualTax(
    inputs: SimulatorInputs,
    year: number,
    grossRentalIncome: number,
    deductibleCharges: number
  ): {
    taxableIncome: number;
    incomeTax: number;
    socialCharges: number;
    totalTax: number;
    taxReduction?: number; // Pinel/Denormandie
    details: Record<string, number>; // ventilation pour l'affichage
  };
  
  calculateCapitalGainsTax(
    purchasePrice: number,
    salePrice: number,
    holdingYears: number,
    totalRenovation: number,
    totalAmortization: number // pertinent SCI IS
  ): {
    taxableGain: number;
    incomeTax: number;
    socialCharges: number;
    totalTax: number;
    netGain: number;
  };
}
```

### 2c. Mise à jour de l'enum TaxRegime

```typescript
enum TaxRegime {
  // Location nue
  MICRO_FONCIER = 'MICRO_FONCIER',
  REEL_FONCIER = 'REEL_FONCIER',
  
  // Location meublée
  LMNP_MICRO_BIC = 'LMNP_MICRO_BIC',
  LMNP_REEL = 'LMNP_REEL',
  LMP_REEL = 'LMP_REEL',
  
  // Société
  SCI_IS = 'SCI_IS',
  
  // Dispositifs de défiscalisation
  PINEL_6 = 'PINEL_6',
  PINEL_9 = 'PINEL_9',
  PINEL_12 = 'PINEL_12',
  DENORMANDIE_6 = 'DENORMANDIE_6',
  DENORMANDIE_9 = 'DENORMANDIE_9',
  DENORMANDIE_12 = 'DENORMANDIE_12',
  
  // Auto-comparaison
  AUTO = 'AUTO',
}
```

### 2d. Barème IR 2026 dans simulatorDefaults.ts

```typescript
export const TAX_BRACKETS_2026 = [
  { min: 0, max: 11497, rate: 0 },
  { min: 11498, max: 29315, rate: 0.11 },
  { min: 29316, max: 83823, rate: 0.30 },
  { min: 83824, max: 180294, rate: 0.41 },
  { min: 180295, max: Infinity, rate: 0.45 },
];

export const SOCIAL_CHARGES_RATE = 0.172; // 17,2%

export const PINEL_ZONES = {
  A_BIS: { label: 'Zone A bis', plafondLoyer: 18.89 },
  A: { label: 'Zone A', plafondLoyer: 14.03 },
  B1: { label: 'Zone B1', plafondLoyer: 11.31 },
};

export const SCI_IS_RATES = {
  REDUCED: { max: 42500, rate: 0.15 },
  NORMAL: { rate: 0.25 },
};

export const FLAT_TAX_RATE = 0.30; // PFU dividendes

export const GUARANTEE_RATES = {
  CREDIT_LOGEMENT: 0.012,
  HYPOTHEQUE: 0.015,
  PPD: 0.007,
  NONE: 0,
};
```

---

## Sprint 3 — Connexion estimateur ANIL + comparaison emprunt + moteur

### 3a. Estimateur ANIL intégré au formulaire

Dans l'étape "Locatif", si l'utilisateur a renseigné une adresse à l'étape "Bien" :

```
┌─────────────────────────────────────────────────┐
│  Loyer hors charges                             │
│  ┌────────────┐                                 │
│  │  850 €/mois │  ← pré-rempli par estimateur   │
│  └────────────┘                                 │
│  💡 Estimation ANIL : 780 — 920 €/mois          │
│     Source : données marché commune (fiabilité   │
│     haute, 245 observations)                    │
│     [Appliquer l'estimation médiane]            │
└─────────────────────────────────────────────────┘
```

**Implémentation :**
- Appeler `RentEstimatorService.estimate()` avec les données du bien (adresse, surface, type, meublé, DPE)
- Afficher fourchette sous le champ loyer
- Bouton "Appliquer" qui pré-remplit le loyer HC avec la médiane
- Si pas d'adresse → champ loyer vide, estimation masquée
- Utiliser le hook `useRentEstimate` existant

### 3b. Comparaison durées d'emprunt

Nouvel onglet dans les résultats : **"Durée optimale d'emprunt"**

Lancer 4 simulations parallèles avec durées : 15, 20, 25, 30 ans (si applicable).

Affichage :

```
┌─────────────────────────────────────────────────────────────────┐
│  Quelle durée d'emprunt choisir ?                              │
│                                                                 │
│  Durée   │ Mensualité │ Cash-flow │ Coût crédit │  TRI  │ VAN  │
│  15 ans  │   1 420€   │  -320€    │   45 600€   │ 8,2%  │ 35k  │
│  20 ans  │   1 150€   │   -50€    │   66 000€   │ 7,8%  │ 42k  │
│  25 ans  │   1 020€   │   +80€    │   86 000€   │ 7,1%  │ 38k  │
│                                                                 │
│  ★ Recommandation : 20 ans — meilleur compromis                │
│    Cash-flow quasi-neutre, TRI élevé, coût crédit raisonnable  │
│                                                                 │
│  [Graphique barres : VAN par durée]                            │
└─────────────────────────────────────────────────────────────────┘
```

**Logique recommandation :**
- Si cash-flow positif dès le départ → durée la plus courte avec CF > 0
- Si cash-flow négatif partout → durée avec le meilleur TRI
- Pondérer : 40% TRI + 30% cash-flow + 30% VAN

### 3c. Mise à jour du moteur InvestmentSimulatorService

Modifier `calculateFullSimulation()` pour intégrer :

**1. Vacance locative :**
```typescript
const effectiveAnnualRent = monthlyRentHC * 12 * (1 - vacancyWeeksPerYear / 52);
```

**2. GLI :**
```typescript
const annualGLI = hasGLI ? monthlyRentHC * 12 * (gliRate / 100) : 0;
// Ajouté aux charges déductibles au réel
```

**3. Apport et garantie dans le TRI :**
```typescript
// Flux initiaux (t=0)
const initialOutflow = -(downPayment + notaryFees + guaranteeCost + bankFees);
// Le reste est financé par l'emprunt
const loanAmount = purchasePrice + renovationCost + furnitureCost - downPayment;
```

**4. Amortissement mobilier (LMNP/LMP réel) :**
```typescript
const annualFurnitureAmortization = furnitureCost / furnitureAmortizationYears;
// Déductible pendant furnitureAmortizationYears années
```

**5. Charges correctement ventilées :**
```typescript
const totalAnnualCharges = 
  annualPropertyTax +
  annualInsurancePNO +
  annualCoproNonRecoverable +
  (monthlyRentHC * 12 * managementFeeRate / 100) +
  annualMaintenance +
  annualOtherCharges +
  annualGLI;
// Les charges récupérables (provisions) ne sont PAS dans ce total
```

**6. Rendement corrigé :**
```typescript
const grossYield = (effectiveAnnualRent / totalInvestment) * 100;
// totalInvestment = purchasePrice + notaryFees + renovationCost + furnitureCost + guaranteeCost + bankFees
const netYield = ((effectiveAnnualRent - totalAnnualCharges) / totalInvestment) * 100;
const netNetYield = ((effectiveAnnualRent - totalAnnualCharges - annualTax) / totalInvestment) * 100;
```

### 3d. Mise à jour de l'UI résultats

Restructurer les onglets de résultats :

```
Onglets résultats :
├── Synthèse (4 KPI cards + graphique projection — existant, enrichi)
├── Fiscalité (comparaison régimes — existant, enrichi avec nouveaux régimes)
├── Durée d'emprunt (NOUVEAU — comparaison 15/20/25 ans)
├── Amortissement (tableau mensuel/annuel — existant)
├── Plus-value (slider année de revente — existant)
└── Placements (comparaison Livret A / AV / Bourse — existant)
```

**KPI cards enrichies :**
```
Card 1 : Rendement net-net → X,X%
Card 2 : Cash-flow mensuel → +/- XXX€ (APRÈS vacance et GLI)
Card 3 : TRI → X,X% (avec apport dans le calcul)
Card 4 : Effort d'épargne mensuel → XXX€ (si cash-flow négatif)
```

---

## Sprint 4 — Export PDF V2 + sauvegarde enrichie

### 4a. Mettre à jour InvestmentReportDocument.tsx

Le PDF 3 pages existant doit refléter les nouvelles données :

Page 1 — Synthèse :
- Ajouter : vacance locative, GLI, apport, garantie
- Afficher loyer HC + charges séparément
- Afficher TMI du foyer

Page 2 — Régimes fiscaux :
- Afficher tous les régimes applicables (pas seulement 4)
- Mettre en valeur le meilleur (★)
- Ajouter colonne "réduction d'impôt" si Pinel/Denormandie

Page 3 — Projections :
- Intégrer vacance dans les projections
- Ajouter ligne "après GLI" si applicable

### 4b. Mise à jour du modèle Prisma InvestmentSimulation

Les nouveaux champs doivent être sauvegardés. Le modèle stocke déjà un JSON `inputs`. Vérifier que le JSON accepte les nouveaux champs sans migration breaking.

Si `inputs` est un `Json` Prisma, pas de migration nécessaire — les nouveaux champs s'ajoutent naturellement. S'assurer que le chargement d'anciennes simulations (sans les nouveaux champs) ne crash pas : utiliser des valeurs par défaut au chargement.

```typescript
// Dans le hook ou le service, au chargement :
const defaults: Partial<SimulatorInputs> = {
  downPayment: 0,
  guaranteeType: 'NONE',
  guaranteeCost: 0,
  bankFees: 1000,
  monthlyChargesProvision: 0,
  annualInsurancePNO: 150,
  annualCoproNonRecoverable: 0,
  managementFeeRate: 0,
  annualMaintenance: 300,
  annualOtherCharges: 0,
  hasGLI: false,
  gliRate: 3.5,
  vacancyWeeksPerYear: 2,
  familyStatus: 'SINGLE',
  annualIncomeDeclarant1: 30000,
  taxShares: 1,
  furnitureCost: 0,
  furnitureAmortizationYears: 7,
  taxRegime: 'AUTO',
};
const inputs = { ...defaults, ...savedInputs };
```

---

## Priorités et dépendances

```
Sprint 1 (formulaire) ← Pas de dépendance, peut démarrer immédiatement
Sprint 2 (régimes fiscaux) ← Dépend du Sprint 1 (nouveaux champs inputs)
Sprint 3 (estimateur + emprunt + moteur) ← Dépend Sprint 1 + 2
Sprint 4 (PDF + sauvegarde) ← Dépend Sprint 1 + 2 + 3
```

## Contraintes

- **Rétrocompatibilité** : les simulations V1 sauvegardées doivent continuer à fonctionner. Valeurs par défaut pour tous les nouveaux champs.
- **Pas d'auth pour le calcul** : l'API POST /api/simulator reste publique (pas d'auth). La sauvegarde nécessite auth.
- **Performance** : le mode AUTO lance ~12 calculs de régimes en parallèle. S'assurer que ça reste < 500ms.
- **i18n** : toutes les nouvelles chaînes en FR + EN dans messages/fr.json et messages/en.json.
- **Mobile** : le formulaire 4 étapes doit rester utilisable sur mobile. Les nouveaux champs ne doivent pas surcharger — utiliser des sections dépliables "Options avancées" pour les champs secondaires.
- **Accessibilité** : labels, placeholders, infobulles explicatives sur chaque champ (comme le "?" de Horiz.io).

## Organisation des champs — affichage simplifié vs avancé

Pour ne pas surcharger le formulaire, organiser ainsi :

**Toujours visible :**
- Bien : type, surface, prix, frais notaire, travaux, adresse
- Financement : apport, durée, taux, assurance
- Locatif : loyer HC, taxe foncière, vacance
- Fiscalité : situation, revenu D1, régime

**Section "Options avancées" (dépliable) :**
- Bien : mobilier, type travaux, durée amortissement mobilier
- Financement : garantie, frais dossier
- Locatif : charges provision, PNO, copro, gestion, entretien, autres, GLI
- Fiscalité : revenu D2, parts fiscales manuelles, année/prix revente

Défaut : options avancées fermées. Les valeurs par défaut sont raisonnables.

## Fichiers à modifier

| Fichier | Modifications |
|---|---|
| `services/InvestmentSimulatorService.ts` | Nouveaux champs inputs, vacance, GLI, apport, garantie, charges ventilées |
| `services/TaxSimulatorService.ts` | Nouveaux régimes (LMP, SCI IS, Pinel, Denormandie), TMI réelle |
| `lib/simulatorDefaults.ts` | Barème IR 2026, plafonds Pinel, taux garantie, constantes SCI IS |
| `app/[locale]/simulateur/SimulatorClient.tsx` | Formulaire enrichi, sections avancées |
| `components/simulator/SimulatorForm.tsx` | Nouveaux champs, validation, sections dépliables |
| `components/simulator/SimulatorResults.tsx` | Nouvel onglet emprunt, KPIs enrichis, régimes enrichis |
| `components/simulator/SimulatorChart.tsx` | Graphique comparaison durées emprunt |
| `hooks/useInvestmentSimulator.ts` | Nouveaux champs, appel estimateur, calculs auto |
| `components/documents/InvestmentReportDocument.tsx` | PDF enrichi |
| `app/api/simulator/route.ts` | Validation nouveaux champs |
| `messages/fr.json` + `messages/en.json` | Nouvelles chaînes i18n |

## Résultat attendu

Après cette V2, le simulateur Coridor est au niveau d'Horiz.io sur le calcul et le dépasse sur l'intégration (estimateur ANIL connecté, gestion locative intégrée). L'utilisateur peut simuler n'importe quel scénario d'investissement locatif français avec tous les régimes fiscaux courants, un calcul de TMI réel, et une aide à la décision complète (durée optimale d'emprunt, meilleur régime fiscal, comparaison placements).
