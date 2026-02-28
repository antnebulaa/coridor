# Prompt d'implémentation — Simulateur d'Investissement Locatif

## Contexte

Coridor dispose déjà d'un moteur financier solide (simulateur fiscal 4 régimes, dashboard rendement, suivi dépenses). Il manque un **simulateur avant-achat public** qui sert d'aimant d'acquisition : une page accessible sans compte, optimisée SEO, où n'importe qui peut simuler la rentabilité d'un investissement locatif. C'est le modèle Horiz.io mais intégré dans l'écosystème Coridor.

## Ce qui existe DÉJÀ (ne pas recréer)

### Simulateur fiscal (TaxSimulatorService.ts — 641 lignes)
- Compare 4 régimes : micro-foncier, réel, micro-BIC, réel LMNP
- Calcul IR progressif 5 tranches (barème 2026), prélèvements sociaux 17.2%
- Déficit foncier (plafond 10 700€), détection LMP (seuil 23 000€)
- Constantes dans `lib/fiscalRules.ts`
- API : `POST /api/tax-simulator` (simuler) + `GET` (pré-remplir depuis biens existants)
- UI : `TaxSimulatorClient.tsx` (680 lignes), formulaire multi-biens, comparaison côte à côte

### Dashboard financier (FinancialDashboard.tsx)
- `analytics.ts` : rendement brut/net/net-net, cash-flow mensuel, évolution YoY
- Sous-composants : KPICards.tsx, CashflowChart.tsx, ExpenseDistributionBar.tsx
- FiscalWidget.tsx : banner saisonnier avril-juin

### Suivi dépenses (ExpensesClient.tsx)
- Model Expense : 16 catégories, déductibilité auto (FiscalService.ts)
- CRUD complet, fréquences, pièces justificatives Cloudinary

### Récap fiscal
- `FiscalService.generateFiscalSummary()` : lignes déclaration 2044

### Constantes fiscales (lib/fiscalRules.ts)
- Barème IR 2026, PS 17.2%, seuils micro-foncier/BIC, taux abattement
- **Réutiliser ces constantes dans le simulateur d'investissement**

⚠️ **IMPORTANT** : Le simulateur d'investissement RÉUTILISE le TaxSimulatorService existant pour la partie fiscale. Ne pas recoder le calcul d'impôts.

---

## Ce qu'il faut construire

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────┐
│          /simulateur (page publique, pas d'auth)    │
│                                                     │
│  Formulaire en étapes :                             │
│  [Achat] → [Financement] → [Location] → [Fiscalité]│
│                                                     │
│  ↓                                                  │
│                                                     │
│  Dashboard résultat :                               │
│  • KPIs (rendement, cash-flow, TRI)                 │
│  • Graphique cash-flow sur X ans                    │
│  • Tableau amortissement crédit                     │
│  • Comparaison régimes fiscaux                      │
│  • Comparaison vs placements                        │
│  • Plus-value estimée                               │
│                                                     │
│  [Sauvegarder] → inscription/login                  │
│  [Exporter PDF] → rapport branded Coridor           │
│                                                     │
│  Version connectée enrichie :                       │
│  • Simulations sauvegardées                         │
│  • Pré-remplissage depuis biens existants           │
│  • Historique des simulations                       │
└─────────────────────────────────────────────────────┘
```

---

## Sprint 1 — Moteur de calcul (InvestmentSimulatorService)

### 1a. Nouveau service

Nouveau fichier : `services/InvestmentSimulatorService.ts`

Ce service est le cœur du simulateur. Il prend des inputs et retourne tous les KPIs.

```typescript
// === TYPES INPUT ===

interface InvestmentInput {
  // Achat
  purchasePrice: number;        // Prix d'achat du bien (€)
  notaryFeesRate: number;       // Taux frais de notaire (défaut: 0.08 pour ancien, 0.03 pour neuf)
  renovationCost: number;       // Travaux (€, défaut: 0)
  furnitureCost: number;        // Ameublement si meublé (€, défaut: 0)
  
  // Financement
  personalContribution: number; // Apport personnel (€)
  loanRate: number;             // Taux d'intérêt annuel (ex: 0.035 pour 3.5%)
  loanDurationYears: number;    // Durée du prêt (années, ex: 20)
  loanInsuranceRate: number;    // Assurance emprunteur annuelle (ex: 0.0034)
  bankFees: number;             // Frais de dossier bancaire (€, défaut: 0)
  
  // Location
  monthlyRent: number;          // Loyer mensuel charges comprises (€)
  monthlyCharges: number;       // Charges mensuelles non récupérables (€)
  propertyTaxYearly: number;    // Taxe foncière annuelle (€)
  insuranceYearly: number;      // Assurance PNO annuelle (€)
  managementFeesRate: number;   // Frais de gestion (% du loyer, 0 si autogestion)
  vacancyRate: number;          // Taux de vacance locative (ex: 0.05 pour 1 mois/2 ans)
  maintenanceYearly: number;    // Provision travaux annuelle (€)
  coprYearly: number;           // Charges copropriété annuelles (€, part non récupérable)
  
  // Fiscalité
  taxRegime: 'micro_foncier' | 'reel' | 'micro_bic' | 'reel_lmnp';
  marginalTaxRate: number;      // TMI du foyer (ex: 0.30 pour 30%)
  isFurnished: boolean;         // Meublé ou nu
  
  // Projection
  projectionYears: number;      // Horizon de simulation (défaut: 20)
  annualRentIncrease: number;   // Revalorisation annuelle du loyer (défaut: 0.02)
  annualPropertyValueIncrease: number; // Valorisation annuelle du bien (défaut: 0.01)
  annualChargesIncrease: number;       // Augmentation annuelle des charges (défaut: 0.02)
}

// === TYPES OUTPUT ===

interface InvestmentResult {
  // KPIs principaux
  grossYield: number;           // Rendement brut (%)
  netYield: number;             // Rendement net (%)
  netNetYield: number;          // Rendement net-net après impôts (%)
  monthlyCashflow: number;      // Cash-flow mensuel année 1 (€)
  totalInvestment: number;      // Investissement total (achat + notaire + travaux + ameublement)
  loanAmount: number;           // Montant emprunté (€)
  monthlyLoanPayment: number;   // Mensualité crédit (€)
  
  // TRI et VAN
  tri: number;                  // Taux de Rentabilité Interne sur l'horizon (%)
  van: number;                  // Valeur Actuelle Nette (€) — taux d'actualisation: 3%
  breakevenMonth: number | null; // Mois où le cash-flow cumulé devient positif (null si jamais)
  
  // Fiscalité (via TaxSimulatorService existant)
  yearlyTax: number;            // Impôt annuel année 1 (IR + PS)
  taxRegimeComparison: TaxRegimeComparison[]; // Comparaison 4 régimes
  recommendedRegime: string;    // Régime recommandé
  
  // Plus-value
  estimatedResalePrice: number; // Prix estimé à la revente (fin d'horizon)
  capitalGain: number;          // Plus-value brute (€)
  capitalGainTax: number;       // Impôt sur plus-value (après abattements durée)
  netCapitalGain: number;       // Plus-value nette (€)
  
  // Comparaison placements
  vsLivretA: PlacementComparison;     // Capital final si Livret A (3%)
  vsAssuranceVie: PlacementComparison; // Capital final si Assurance-vie fonds euros (2%)
  vsBourseSP500: PlacementComparison;  // Capital final si bourse (7% historique)
  
  // Projection annuelle
  yearlyProjection: YearlyProjection[]; // Détail année par année
  
  // Amortissement crédit
  loanAmortization: LoanAmortizationRow[]; // Tableau mois par mois ou année par année
}

interface YearlyProjection {
  year: number;
  grossRent: number;            // Loyers bruts
  netRent: number;              // Loyers nets (après vacance, charges)
  loanPayment: number;          // Remboursement crédit annuel
  tax: number;                  // Impôt
  cashflow: number;             // Cash-flow net
  cumulativeCashflow: number;   // Cash-flow cumulé
  propertyValue: number;        // Valeur estimée du bien
  remainingLoan: number;        // Capital restant dû
  netWealth: number;            // Patrimoine net (valeur bien - capital restant)
}

interface LoanAmortizationRow {
  month: number;                // ou year si agrégé
  payment: number;              // Mensualité
  principal: number;            // Part capital
  interest: number;             // Part intérêts
  insurance: number;            // Assurance
  remainingBalance: number;     // Capital restant dû
}

interface PlacementComparison {
  name: string;
  annualRate: number;
  totalInvested: number;        // Même montant que l'apport
  finalValue: number;           // Capital final après X ans
  totalGain: number;            // Gain total
}

interface TaxRegimeComparison {
  regime: string;
  label: string;
  yearlyTax: number;
  netCashflow: number;
  isRecommended: boolean;
}
```

### 1b. Méthodes du service

```typescript
export class InvestmentSimulatorService {

  /**
   * Simulation complète. Point d'entrée principal.
   * Calcule TOUS les KPIs à partir des inputs.
   */
  static simulate(input: InvestmentInput): InvestmentResult

  /**
   * Calcul du tableau d'amortissement du crédit.
   * Formule mensualité : M = C × (t/12) / (1 - (1 + t/12)^(-n×12))
   * où C = capital, t = taux annuel, n = durée en années.
   */
  static calculateLoanAmortization(params: {
    loanAmount: number;
    annualRate: number;
    durationYears: number;
    insuranceRate: number;
  }): LoanAmortizationRow[]

  /**
   * Calcul du TRI (Taux de Rentabilité Interne).
   * 
   * Flux pris en compte :
   * - Année 0 : -apport - frais notaire - travaux - frais bancaires (flux négatif)
   * - Années 1 à N : cash-flow annuel net (loyers - charges - crédit - impôts)
   * - Année N : + prix de revente net (après impôt plus-value) - capital restant dû
   * 
   * Méthode : Newton-Raphson ou dichotomie pour trouver le taux r
   * tel que NPV(r) = 0.
   */
  static calculateTRI(cashflows: number[]): number

  /**
   * Calcul de la VAN (Valeur Actuelle Nette).
   * VAN = Σ (flux_t / (1+r)^t) où r = taux d'actualisation (défaut 3%)
   */
  static calculateVAN(cashflows: number[], discountRate?: number): number

  /**
   * Calcul de l'impôt sur la plus-value immobilière.
   * Abattements pour durée de détention :
   * - IR (19%) : 6% par an de la 6e à la 21e année, 4% la 22e → exonéré après 22 ans
   * - PS (17.2%) : 1.65% de la 6e à la 21e, 1.60% la 22e, 9% par an de 23e à 30e → exonéré après 30 ans
   * - Surtaxe si plus-value > 50 000€
   */
  static calculateCapitalGainTax(params: {
    purchasePrice: number;
    notaryFees: number;
    renovationCost: number;
    resalePrice: number;
    holdingYears: number;
  }): { taxIR: number; taxPS: number; surtax: number; total: number; netGain: number }

  /**
   * Comparaison avec placements alternatifs.
   * Simule le placement du même apport sur Livret A, assurance-vie, bourse.
   * Formule : capital × (1 + taux)^années
   * Intérêts composés, sans versements complémentaires.
   */
  static comparePlacements(params: {
    investedAmount: number;
    years: number;
  }): PlacementComparison[]

  /**
   * Projection année par année.
   * Applique les taux d'augmentation annuels (loyer, charges, valeur bien).
   * Intègre le tableau d'amortissement.
   * Appelle TaxSimulatorService pour le calcul fiscal de chaque année.
   */
  static projectYearly(input: InvestmentInput): YearlyProjection[]

  /**
   * Point mort : premier mois où le cash-flow cumulé > 0.
   */
  static findBreakevenMonth(yearlyProjection: YearlyProjection[]): number | null

  /**
   * Comparaison des 4 régimes fiscaux pour cette simulation.
   * Réutilise TaxSimulatorService.simulate() pour chaque régime.
   * Retourne le classement + régime recommandé.
   */
  static compareRegimes(input: InvestmentInput): TaxRegimeComparison[]
}
```

### 1c. Intégration avec TaxSimulatorService existant

Le calcul fiscal NE DOIT PAS être recodé. Appeler le service existant :

```typescript
// Dans InvestmentSimulatorService.simulate() :
import { TaxSimulatorService } from './TaxSimulatorService';

// Construire les params depuis InvestmentInput
const taxResult = TaxSimulatorService.simulate({
  regime: input.taxRegime,
  grossRent: input.monthlyRent * 12,
  deductibleExpenses: totalDeductible, // charges déductibles
  loanInterest: yearlyInterest,        // intérêts d'emprunt (déductibles en réel)
  marginalRate: input.marginalTaxRate,
  // ... adapter au format attendu par TaxSimulatorService
});
```

Utiliser les constantes de `lib/fiscalRules.ts` (barème IR, PS, seuils micro, etc.).

### 1d. Schema Prisma — Simulations sauvegardées

```prisma
model InvestmentSimulation {
  id                String    @id @default(uuid())
  userId            String?   // null si simulation anonyme (pas encore inscrit)
  
  // Nom donné par l'utilisateur
  name              String    @default("Ma simulation")
  
  // Inputs (stockés en JSON pour flexibilité)
  inputs            Json      // InvestmentInput complet
  
  // Résultats (cachés pour éviter de recalculer)
  results           Json?     // InvestmentResult complet
  
  // Métadonnées
  isPublic          Boolean   @default(false) // Pour partage par lien
  shareToken        String?   @unique         // Token de partage
  
  user              User?     @relation(fields: [userId], references: [id])
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  @@index([userId])
}
```

Ajouter la relation inverse sur User :
```prisma
model User {
  // ... existant ...
  investmentSimulations  InvestmentSimulation[]
}
```

---

## Sprint 2 — API Routes

### 2a. Simulation (publique, pas d'auth requise)

Nouveau fichier : `app/api/simulator/route.ts`

```
POST /api/simulator
  Body: InvestmentInput
  → Retourne InvestmentResult complet
  → Pas d'auth requise (page publique)
  → Rate limiting : 20 simulations/heure par IP
```

### 2b. Sauvegarde (auth requise)

Nouveau fichier : `app/api/simulator/save/route.ts`

```
POST /api/simulator/save
  Body: { name: string, inputs: InvestmentInput, results: InvestmentResult }
  → Auth requise
  → Crée InvestmentSimulation en DB
  → Retourne l'ID

GET /api/simulator/saved
  → Auth requise
  → Liste des simulations sauvegardées de l'utilisateur
  → Triées par date desc

GET /api/simulator/saved/[id]
  → Auth requise (ou shareToken valide)
  → Retourne simulation complète (inputs + results)

DELETE /api/simulator/saved/[id]
  → Auth requise
  → Supprime la simulation

PATCH /api/simulator/saved/[id]
  → Auth requise
  → Met à jour le nom ou les inputs (recalcule les résultats)
```

### 2c. Partage par lien

```
POST /api/simulator/saved/[id]/share
  → Auth requise
  → Génère un shareToken unique
  → Retourne le lien : /simulateur/shared/[shareToken]

GET /api/simulator/shared/[shareToken]
  → Pas d'auth requise
  → Retourne simulation en lecture seule
```

### 2d. Export PDF

Nouveau fichier : `app/api/simulator/export-pdf/route.ts`

```
POST /api/simulator/export-pdf
  Body: { inputs: InvestmentInput, results: InvestmentResult }
  → Génère un PDF du rapport complet (voir Sprint 4)
  → Retourne le PDF directement (pas d'upload Cloudinary, stream)
  → Pas d'auth requise (mais rate limited)
```

---

## Sprint 3 — Page publique `/simulateur`

### 3a. Page standalone

Nouveau fichier : `app/[locale]/simulateur/page.tsx`

Cette page est **publique** (pas de layout auth, pas de sidebar Coridor). Elle a son propre layout épuré avec juste le logo Coridor en haut.

**SEO** :
```typescript
export const metadata = {
  title: "Simulateur de Rendement Locatif Gratuit — Coridor",
  description: "Calculez gratuitement la rentabilité de votre investissement locatif : rendement net, cash-flow, TRI, comparaison fiscale, tableau d'amortissement. Outil complet et sans inscription.",
  keywords: ["simulateur rendement locatif", "calcul rentabilité locative", "investissement locatif simulation", "rendement net immobilier"],
};
```

### 3b. Formulaire multi-étapes

Composant : `components/simulator/SimulatorForm.tsx`

**Étape 1 — Le bien**
```
┌─────────────────────────────────────────┐
│  🏠 Votre projet                        │
│                                         │
│  Prix d'achat              250 000 €    │
│  ○ Ancien (frais ~8%)  ● Neuf (~3%)    │
│  Travaux                    15 000 €    │
│  Ameublement (si meublé)     5 000 €   │
│                                         │
│  Type : ○ Nu  ● Meublé                 │
│  Surface :              45 m²           │
│  Ville :          [autocomplete]        │
│                                         │
│                          [Suivant →]    │
└─────────────────────────────────────────┘
```

**Étape 2 — Financement**
```
┌─────────────────────────────────────────┐
│  🏦 Financement                         │
│                                         │
│  Apport personnel           50 000 €    │
│  Durée du prêt            20 ans  [▾]   │
│  Taux d'intérêt              3.50 %     │
│  Assurance emprunteur        0.34 %     │
│  Frais de dossier              500 €    │
│                                         │
│  ┌─ Résumé crédit ─────────────────┐   │
│  │ Montant emprunté : 222 000 €     │   │
│  │ Mensualité estimée : 1 285 €     │   │
│  │ Coût total du crédit : 88 400 €  │   │
│  └──────────────────────────────────┘   │
│                                         │
│              [← Retour]  [Suivant →]    │
└─────────────────────────────────────────┘
```

Le résumé crédit se met à jour en **temps réel** quand l'utilisateur change les valeurs.

**Étape 3 — Location**
```
┌─────────────────────────────────────────┐
│  🔑 Location                            │
│                                         │
│  Loyer mensuel (CC)          1 200 €    │
│  Charges non récupérables      150 €/m  │
│  Taxe foncière               1 200 €/an │
│  Assurance PNO                 250 €/an │
│  Charges copro (part proprio)  600 €/an │
│  Provision travaux/entretien   500 €/an │
│  Gestion locative               0 % [▾] │
│    ○ Autogestion (0%)                   │
│    ○ Agence (~7-8%)                     │
│    ○ Coridor (gratuit 😉)               │
│  Vacance locative              1 mois/an│
│                                         │
│              [← Retour]  [Suivant →]    │
└─────────────────────────────────────────┘
```

**Étape 4 — Fiscalité & Projection**
```
┌─────────────────────────────────────────┐
│  📊 Fiscalité & Projection              │
│                                         │
│  Votre TMI (tranche marginale)    30 %  │
│    ○ 0%  ○ 11%  ○ 30%  ○ 41%  ○ 45%  │
│                                         │
│  Horizon de simulation         20 ans   │
│  Revalorisation loyer/an        2.0 %   │
│  Valorisation bien/an           1.0 %   │
│  Augmentation charges/an        2.0 %   │
│                                         │
│              [← Retour]  [Simuler →]    │
└─────────────────────────────────────────┘
```

### 3c. Dashboard de résultats

Composant : `components/simulator/SimulatorResults.tsx`

Affiché sous le formulaire après clic "Simuler". L'utilisateur peut modifier les inputs en haut et les résultats se recalculent instantanément.

**Section 1 — KPIs principaux (4 cartes)**
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Rendement│ │Cash-flow │ │   TRI    │ │ Point    │
│  net-net │ │ mensuel  │ │ sur 20a  │ │  mort    │
│  4.2%    │ │  +185€   │ │  7.8%    │ │ 14 mois  │
│          │ │          │ │          │ │          │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

Couleurs : vert si positif/bon, orange si moyen, rouge si négatif.

**Section 2 — Graphique cash-flow sur X ans**

Graphique en barres ou lignes (recharts) montrant année par année :
- Cash-flow net (barres)
- Cash-flow cumulé (ligne)
- Patrimoine net = valeur bien - capital restant (ligne secondaire)

**Section 3 — Comparaison régimes fiscaux**

Tableau :
```
┌────────────────────┬───────────┬──────────────┬─────────────┐
│ Régime             │ Impôt/an  │ Cash-flow/m  │ Recommandé  │
│ Micro-foncier      │ 2 340 €   │    +85 €     │             │
│ Réel               │ 1 680 €   │   +140 €     │     ★       │
│ Micro-BIC          │ 1 890 €   │   +120 €     │             │
│ LMNP réel          │   920 €   │   +185 €     │  ★ Optimal  │
└────────────────────┴───────────┴──────────────┴─────────────┘
```

Highlight le régime optimal. Afficher "Meublé non applicable" pour les régimes meublés si le bien est nu (et inversement).

**Section 4 — Tableau d'amortissement crédit**

Tableau replié par défaut, déplié au clic. Vue par année (pas par mois, trop long) :
```
┌───────┬──────────┬──────────┬──────────┬───────────────┐
│ Année │ Capital  │ Intérêts │ Assurance│ Restant dû    │
│   1   │ 8 540 €  │ 7 624 €  │  755 €   │ 213 460 €    │
│   2   │ 8 842 €  │ 7 322 €  │  755 €   │ 204 618 €    │
│  ...  │          │          │          │               │
│  20   │ 14 980 € │   526 €  │  755 €   │       0 €    │
└───────┴──────────┴──────────┴──────────┴───────────────┘
```

Option d'afficher mois par mois.

**Section 5 — Plus-value à la revente**
```
┌─────────────────────────────────────────┐
│ 📈 Estimation à la revente (20 ans)     │
│                                         │
│ Prix d'achat ............. 250 000 €    │
│ Prix estimé revente ...... 305 000 €    │
│ Plus-value brute .........  55 000 €    │
│ Abattement IR (100%) ....  -19 000 €   │ ← exonéré après 22 ans
│ Abattement PS ............  -5 000 €   │
│ Impôt plus-value .........       0 €   │ ← exonéré
│ Plus-value nette .........  55 000 €    │
│                                         │
│ Si revente à 10 ans :     41 200 €      │
│ Impôt PV (10 ans) :       6 840 €      │
└─────────────────────────────────────────┘
```

Slider pour changer l'année de revente et voir l'impact fiscal.

**Section 6 — Comparaison vs placements**
```
┌─────────────────────────────────────────┐
│ 🏦 Et si vous placiez votre apport     │
│    de 50 000€ ailleurs ?                │
│                                         │
│ Immobilier (votre projet)               │
│ ████████████████████████  92 400 €      │
│ Patrimoine net après 20 ans             │
│                                         │
│ Bourse (S&P 500, ~7%/an)               │
│ ██████████████████████████ 193 500 €    │
│                                         │
│ Assurance-vie fonds euros (~2%/an)      │
│ ████████████  74 300 €                  │
│                                         │
│ Livret A (3%/an plafonné)               │
│ ████████████  90 300 €                  │
│                                         │
│ ⚠️ L'immobilier utilise l'effet de     │
│ levier du crédit. Avec 50K€ d'apport   │
│ vous contrôlez un bien de 272K€.        │
└─────────────────────────────────────────┘

```

Inclure une note pédagogique sur l'effet de levier — c'est ce qui rend la comparaison honnête. Sans levier, la bourse gagne presque toujours. Avec levier, l'immobilier peut surperformer.

### 3d. Boutons d'action

Sous les résultats :

- **"Sauvegarder ma simulation"** → Si connecté : sauvegarde directe. Si pas connecté : modale inscription/connexion, puis sauvegarde.
- **"Exporter en PDF"** → Génère le rapport PDF (Sprint 4). Disponible sans compte.
- **"Partager"** → Génère un lien partageable (si sauvegardé).
- **"Modifier les paramètres"** → Scroll vers le formulaire.

### 3e. Page simulations sauvegardées

Nouveau fichier : `app/[locale]/account/simulations/page.tsx`

Liste des simulations sauvegardées avec :
- Nom, date, KPIs clés (rendement, cash-flow)
- Actions : Voir, Dupliquer, Supprimer, Partager
- Bouton "Nouvelle simulation" → redirige vers /simulateur

---

## Sprint 4 — Export PDF

### 4a. Document PDF

Nouveau fichier : `components/documents/InvestmentReportDocument.tsx`

Via @react-pdf/renderer (même stack que les autres PDFs Coridor).

Structure du rapport :
```
═══════════════════════════════════════════
RAPPORT D'INVESTISSEMENT LOCATIF
Généré par Coridor — [date]
═══════════════════════════════════════════

1. SYNTHÈSE
   Rendement net-net : X%
   Cash-flow mensuel : +X€
   TRI sur X ans : X%
   Régime fiscal recommandé : [régime]

2. LE PROJET
   Prix d'achat, frais, travaux, localisation
   
3. FINANCEMENT
   Apport, crédit, mensualité
   Tableau d'amortissement (premières et dernières lignes)

4. REVENUS & CHARGES
   Loyer, charges, taxe foncière, gestion, vacance
   
5. FISCALITÉ
   Comparaison 4 régimes, régime recommandé, impôt détaillé

6. PROJECTION SUR X ANS
   Tableau année par année (cash-flow, patrimoine net)

7. PLUS-VALUE ESTIMÉE
   Scénario de revente, abattements, impôt

8. COMPARAISON PLACEMENTS
   Immobilier vs Livret A vs Assurance-vie vs Bourse

═══════════════════════════════════════════
Simulation réalisée sur Coridor.fr
La plateforme de gestion locative transparente
═══════════════════════════════════════════
```

Style : professionnel, sobre, présentable à un banquier. Logo Coridor en header. Couleur accent #E8A838.

---

## Sprint 5 — ACCOUNTING_EXPORT + Polish

### 5a. ACCOUNTING_EXPORT (le trou identifié dans l'audit)

Nouveau fichier : `app/api/accounting/export/route.ts`

```
GET /api/accounting/export?year=2025&format=pdf
GET /api/accounting/export?year=2025&format=csv
```

- **PDF** : récapitulatif fiscal annuel avec lignes déclaration 2044, généré via `FiscalService.generateFiscalSummary()`
- **CSV** : export des dépenses + revenus pour import comptable

Ajouter un bouton "Exporter" dans le dashboard financier existant (FinancialDashboard.tsx) et dans la page dépenses (ExpensesClient.tsx).

### 5b. Valeurs par défaut intelligentes

Le formulaire du simulateur doit proposer des **valeurs par défaut réalistes** pour la France 2026 :
- Frais de notaire : 8% (ancien), 3% (neuf)
- Taux crédit : 3.50%
- Assurance emprunteur : 0.34%
- Vacance locative : 1 mois / 2 ans (4.2%)
- TMI : 30% (le plus courant)
- Revalorisation loyer : 2%/an (proche IRL)
- Valorisation bien : 1%/an (conservateur)
- Livret A : 3%, Assurance-vie : 2%, Bourse : 7%

Stocker ces défauts dans un fichier de constantes `lib/simulatorDefaults.ts` pour faciliter les mises à jour.

### 5c. Responsive mobile

Le simulateur public sera vu sur mobile (via partage WhatsApp, réseaux sociaux). Le formulaire multi-étapes et le dashboard de résultats doivent être **parfaitement responsive**. Les graphiques recharts s'adaptent. Le tableau d'amortissement scroll horizontalement sur mobile.

---

## Fichiers créés / modifiés

| Fichier | Action | Sprint |
|---------|--------|--------|
| `services/InvestmentSimulatorService.ts` | Créer — moteur complet | 1 |
| `lib/simulatorDefaults.ts` | Créer — constantes par défaut | 1 |
| `prisma/schema.prisma` | Modifier — InvestmentSimulation | 1 |
| `app/api/simulator/route.ts` | Créer — POST simulation | 2 |
| `app/api/simulator/save/route.ts` | Créer — CRUD sauvegarde | 2 |
| `app/api/simulator/save/[id]/route.ts` | Créer — GET/PATCH/DELETE | 2 |
| `app/api/simulator/save/[id]/share/route.ts` | Créer — POST partage | 2 |
| `app/api/simulator/shared/[shareToken]/route.ts` | Créer — GET public | 2 |
| `app/api/simulator/export-pdf/route.ts` | Créer — POST export | 2 |
| `components/simulator/SimulatorForm.tsx` | Créer — formulaire 4 étapes | 3 |
| `components/simulator/SimulatorResults.tsx` | Créer — dashboard résultats | 3 |
| `components/simulator/KPICards.tsx` | Créer — 4 cartes KPI | 3 |
| `components/simulator/CashflowProjectionChart.tsx` | Créer — graphique projection | 3 |
| `components/simulator/RegimeComparison.tsx` | Créer — tableau régimes | 3 |
| `components/simulator/LoanAmortizationTable.tsx` | Créer — tableau amortissement | 3 |
| `components/simulator/CapitalGainEstimate.tsx` | Créer — plus-value | 3 |
| `components/simulator/PlacementComparison.tsx` | Créer — comparaison placements | 3 |
| `app/[locale]/simulateur/page.tsx` | Créer — page publique | 3 |
| `app/[locale]/simulateur/layout.tsx` | Créer — layout épuré (logo only) | 3 |
| `app/[locale]/simulateur/shared/[shareToken]/page.tsx` | Créer — vue partagée | 3 |
| `app/[locale]/account/simulations/page.tsx` | Créer — liste simulations | 3 |
| `hooks/useInvestmentSimulator.ts` | Créer — hook client | 3 |
| `components/documents/InvestmentReportDocument.tsx` | Créer — PDF rapport | 4 |
| `app/api/accounting/export/route.ts` | Créer — export comptable | 5 |
| `components/dashboard/FinancialDashboard.tsx` | Modifier — bouton export | 5 |

---

## Vérification

1. `npx prisma db push` — schema valide
2. `npm run build` — 0 erreurs TypeScript
3. Page `/simulateur` accessible sans connexion
4. Remplir le formulaire → résultats corrects (vérifier les calculs manuellement)
5. Rendement brut = loyer annuel / prix total × 100 → vérifier
6. Mensualité crédit = formule amortissement standard → vérifier vs simulateur bancaire
7. TRI positif si le projet est rentable, négatif sinon
8. Comparaison régimes → le recommandé est bien celui avec le moins d'impôt
9. Plus-value après 22 ans → exonérée d'IR → vérifier
10. Comparaison placements → les formules d'intérêts composés sont correctes
11. Sauvegarder → inscription → simulation retrouvée dans /account/simulations
12. Exporter PDF → rapport complet, lisible, professionnel
13. Partager → lien fonctionne sans connexion
14. ACCOUNTING_EXPORT → CSV et PDF téléchargeables depuis le dashboard financier
15. Mobile → formulaire et résultats lisibles sur iPhone

## Règles absolues

1. **RÉUTILISER TaxSimulatorService** pour tous les calculs fiscaux — ne pas recoder
2. **RÉUTILISER lib/fiscalRules.ts** pour les constantes fiscales
3. La page `/simulateur` est **100% publique**, pas d'auth, pas de sidebar
4. Les calculs se font **côté serveur** (API route) — pas de formules financières côté client
5. Les montants sont en **euros (number)**, pas en centimes (c'est un simulateur, pas un ledger)
6. Le TRI utilise la méthode **Newton-Raphson** (convergence rapide, précis)
7. L'impôt sur plus-value suit les **abattements réels** par année de détention
8. Le PDF est généré via **@react-pdf/renderer** (même stack que le reste)
9. Les valeurs par défaut sont **réalistes France 2026** et documentées
10. Le design suit le **thème Coridor** (accent #E8A838, sobre, professionnel)
