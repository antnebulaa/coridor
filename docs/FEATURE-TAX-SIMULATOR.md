# Feature — Simulateur Fiscal Propriétaire

> **Coridor** — Spec fonctionnelle et technique  
> Date : 18 février 2026  
> Auteur : Claude (recherche) + Adrien (validation)  
> Statut : À VALIDER puis implémenter

---

## 1. Objectif

Permettre au propriétaire de **comparer les régimes fiscaux** applicables à ses biens locatifs et d'estimer l'imposition nette sur ses revenus locatifs. Le simulateur oriente le choix entre régimes sans se substituer à un conseil fiscal professionnel.

**Périmètre V1 :**
- Location nue : micro-foncier vs régime réel (déclaration 2044)
- Location meublée : micro-BIC vs régime réel LMNP
- Détection automatique du statut LMP (seuils)
- Calcul du déficit foncier (location nue, régime réel)
- Estimation IR + prélèvements sociaux

**Hors périmètre V1 :**
- SCI à l'IS
- Dispositifs spécifiques (Pinel, Denormandie, Loc'Avantages, Malraux)
- Déclaration fiscale automatique (formulaires 2044, 2031)
- Calcul des plus-values à la revente (incluant réintégration amortissements LMNP)
- Location saisonnière / meublé de tourisme

---

## 2. Constantes fiscales 2025-2026

Toutes les constantes sont regroupées dans un fichier unique `fiscalRules.ts` pour faciliter la mise à jour annuelle.

### 2.1 Barème IR 2026 (revenus 2025)

Revalorisé de ~1,8% par rapport au barème 2025.

```typescript
// Source : PLF 2026, art. 2 (49.3) — revalorisé de 0,9% sur revenus 2025
// Barème 2026 appliqué aux revenus perçus en 2025
export const IR_BRACKETS_2026 = [
  { min: 0,      max: 11_497,  rate: 0.00 },
  { min: 11_498, max: 29_315,  rate: 0.11 },
  { min: 29_316, max: 83_823,  rate: 0.30 },
  { min: 83_824, max: 180_294, rate: 0.41 },
  { min: 180_295, max: Infinity, rate: 0.45 },
];
```

> ⚠️ **Note** : Le barème 2026 définitif n'est pas encore voté au moment de la rédaction. Les seuils ci-dessus sont ceux du PLF 2026 (texte 49.3). À confirmer après promulgation.

### 2.2 Prélèvements sociaux

```typescript
// Source : LFSS 2026 (promulguée 31/12/2025)
export const PRELEVEMENTS_SOCIAUX = {
  // Revenus fonciers (location nue) — taux maintenu à 17,2%
  REVENUS_FONCIERS: 0.172,
  // CSG 9,2% + CRDS 0,5% + prélèvement solidarité 7,5%

  // Revenus BIC meublé (LMNP) — hausse CSG à 10,6%
  // IMPORTANT : la hausse de CSG à 10,6% concerne les revenus du patrimoine
  // SAUF revenus fonciers et plus-values immo qui restent à 9,2%
  // Pour les BIC LMNP : 18,6% (10,6% CSG + 0,5% CRDS + 7,5% solidarité)
  REVENUS_BIC_LMNP: 0.186,

  // Plus-values immobilières — maintenu à 17,2%
  PLUS_VALUES_IMMO: 0.172,
};
```

> **Attention :** Il y a un flou juridique sur l'application du taux de 18,6% aux BIC meublés. Certaines sources indiquent que les revenus BIC LMNP restent à 17,2% car ils sont considérés comme des revenus d'activité non salariée et non des revenus du patrimoine classiques. **Recommandation : utiliser 17,2% par défaut et mentionner le débat dans l'UI.** À confirmer avec un comptable ou via la doctrine fiscale actualisée.

### 2.3 Location nue — Régimes

```typescript
// Source : CGI art. 32 (micro-foncier), CGI art. 28-31 (réel)
export const LOCATION_NUE = {
  MICRO_FONCIER: {
    seuil: 15_000,          // Revenus fonciers bruts max (CGI art. 32)
    abattement: 0.30,       // 30% forfaitaire
    // Abattement de 50% discuté (PLF 2025 amendement I-2445)
    // mais NON adopté dans la loi de finances 2025 finale
    // Reste à 30% en 2025 et 2026
  },
  REGIME_REEL: {
    engagement_duree_ans: 3, // Option irrévocable 3 ans minimum
    // Charges déductibles : travaux, intérêts emprunt, taxe foncière,
    // assurance PNO, frais de gestion (20€ forfait/local),
    // charges copropriété, frais de procédure
  },
};
```

### 2.4 Location meublée — Régimes

```typescript
// Source : CGI art. 50-0 (micro-BIC), loi Le Meur 2024-1039, LF 2025
export const LOCATION_MEUBLEE = {
  MICRO_BIC: {
    // Location meublée LONGUE DURÉE
    longue_duree: {
      seuil: 77_700,        // Plafond recettes annuelles
      abattement: 0.50,     // 50% forfaitaire
    },
    // Location meublée COURTE DURÉE (tourisme non classé)
    // Hors scope V1, mais documenté pour référence
    courte_duree_non_classe: {
      seuil: 15_000,        // Réduit par loi Le Meur (était 77 700€)
      abattement: 0.30,     // Réduit (était 50%)
    },
    courte_duree_classe: {
      seuil: 77_700,
      abattement: 0.50,     // Réduit (était 71%)
    },
  },
  REGIME_REEL: {
    // Charges déductibles + amortissements (bien, mobilier, travaux)
    // Amortissement bien : composants (structure ~2%, toiture ~4%, etc.)
    // Amortissement mobilier : 5-10 ans selon équipement
    engagement_duree_ans: 2, // Option pour 2 exercices minimum
  },
};
```

### 2.5 Seuils LMP

```typescript
// Source : CGI art. 155 IV
export const LMP = {
  seuil_recettes: 23_000,  // Recettes annuelles brutes TTC
  // Conditions CUMULATIVES pour être LMP :
  // 1. Recettes > 23 000€
  // 2. Recettes > autres revenus d'activité du foyer fiscal
  cotisations_sociales_taux: 0.40, // ~35-45% selon situation (estimation)
  cotisations_minimum: 1_220,      // Forfait minimum même si résultat nul (2026)
};
```

### 2.6 Déficit foncier

```typescript
// Source : CGI art. 156-I-3°
export const DEFICIT_FONCIER = {
  plafond_revenu_global: 10_700,    // Imputation max sur revenu global/an
  plafond_cosse_perissol: 15_300,   // Si dispositif Cosse ou Périssol
  plafond_renovation_energetique: 21_400, // Temporaire, dépenses payées avant 31/12/2025
  report_duree_ans: 10,             // Report sur revenus fonciers des 10 années suivantes
  // Les intérêts d'emprunt NE SONT PAS imputables sur le revenu global
  // Ils ne s'imputent que sur les revenus fonciers (année en cours + 10 ans)
  location_obligatoire_ans: 3,      // Maintien en location 3 ans après imputation
};
```

### 2.7 Réintégration amortissements LMNP (depuis 2025)

```typescript
// Source : LF 2025, art. 24 — CGI art. 150 VB modifié
export const REINTEGRATION_AMORTISSEMENTS = {
  applicable_depuis: '2025-02-14',  // Date d'entrée en vigueur
  // Les amortissements déduits (hors mobilier) sont réintégrés
  // dans le calcul de la plus-value à la revente
  // Exceptions : résidences étudiantes, seniors, EHPAD
  // Non applicable aux LMNP micro-BIC
  concerne_regime_reel_uniquement: true,
  // Hors scope V1 (calcul plus-value), mais mentionné dans l'UI
};
```

---

## 3. Architecture technique

### 3.1 Structure des fichiers

```
lib/
  fiscalRules.ts              ← Toutes les constantes (1 fichier, mise à jour annuelle)

services/
  TaxSimulatorService.ts      ← Logique de calcul (stateless, testable)

app/api/
  tax-simulator/
    route.ts                  ← POST — calcul simulation
    
app/[locale]/account/
  tax-simulator/
    page.tsx                  ← Page serveur
    TaxSimulatorClient.tsx    ← Composant client interactif
```

### 3.2 Intégration avec l'existant

Le simulateur **réutilise les données existantes** :
- `FiscalService.ts` — déjà en place, gère la déductibilité des dépenses par catégorie
- `ExpenseService` — données de dépenses réelles du propriétaire
- `Property` / `RentalUnit` / `Listing` — données du bien (type de bail, loyer, charges)
- `Lease` — type de bail (nu/meublé), montant loyer
- Feature flag : `TAX_SIMULATOR` (déjà seedé en DB)

### 3.3 Service — TaxSimulatorService.ts

```typescript
interface SimulationInput {
  // Situation du foyer
  revenuGlobalAnnuel: number;       // Autres revenus imposables du foyer
  nombreParts: number;              // Quotient familial

  // Par bien (peut être multi-biens)
  biens: BienLocatif[];
}

interface BienLocatif {
  propertyId?: string;              // Optionnel — lien Property existante
  typeBail: 'NUE' | 'MEUBLEE';
  loyerAnnuelBrut: number;          // Loyers encaissés
  chargesAnnuelles: number;         // Total charges (si réel)
  interetsEmprunt: number;          // Intérêts d'emprunt annuels
  travauxDeductibles: number;       // Travaux réparation/entretien/amélioration
  taxeFonciere: number;
  assurancePNO: number;
  fraisGestion: number;             // Frais de gestion (dont forfait 20€)
  chargesCopropriete: number;
  // Meublé uniquement
  amortissementBien?: number;       // Amortissement annuel du bien
  amortissementMobilier?: number;   // Amortissement annuel mobilier
  amortissementTravaux?: number;    // Amortissement travaux immobilisés
}

interface SimulationResult {
  // Résultat par régime
  regimes: RegimeResult[];
  // Recommandation
  regimeOptimal: string;
  economieAnnuelle: number;         // Économie du meilleur vs le pire
  // Alertes
  alertes: string[];                // Ex: "Seuil LMP proche", "Déficit reportable"
}

interface RegimeResult {
  nom: string;                      // "Micro-foncier", "Réel 2044", "Micro-BIC", "Réel LMNP"
  revenuImposable: number;          // Base imposable après abattement/déductions
  impotRevenu: number;              // IR calculé
  prelevementsSociaux: number;      // PS calculés
  totalImposition: number;          // IR + PS
  tauxEffectif: number;             // Total / Loyers bruts
  deficitFoncier?: number;          // Si applicable
  deficitReportable?: number;       // Excédent reportable
  eligible: boolean;                // Éligible au régime ?
  raisonIneligibilite?: string;     // Si non éligible
}
```

### 3.4 Logique de calcul

#### A) Location nue — Micro-foncier

```
SI loyerBrutTotal <= 15 000€ ET pas de dispositif spécial :
  revenuImposable = loyerBrut × (1 - 0.30)     // = 70% des loyers
  IR = baremeIR(revenuGlobal + revenuImposable, parts)
  PS = revenuImposable × 17,2%
```

#### B) Location nue — Régime réel (2044)

```
revenuFoncierBrut = loyerBrut
chargesDeductibles = taxeFonciere + assurancePNO + travauxDeductibles 
                   + fraisGestion + chargesCopropriete
                   + interetsEmprunt

revenuFoncierNet = revenuFoncierBrut - chargesDeductibles

SI revenuFoncierNet >= 0 :
  IR = baremeIR(revenuGlobal + revenuFoncierNet, parts)
  PS = revenuFoncierNet × 17,2%

SI revenuFoncierNet < 0 (déficit) :
  deficitTotal = |revenuFoncierNet|
  // Les intérêts d'emprunt ne s'imputent PAS sur le revenu global
  deficitHorsInterets = min(deficitTotal, chargesDeductibles - interetsEmprunt)
  deficitInterets = deficitTotal - deficitHorsInterets

  imputationRevenuGlobal = min(deficitHorsInterets, 10_700)
  deficitReportableFoncier = deficitTotal - imputationRevenuGlobal + deficitInterets

  revenuGlobalReduit = revenuGlobal - imputationRevenuGlobal
  IR = baremeIR(revenuGlobalReduit, parts)
  PS = 0  // Pas de PS si déficit foncier
```

#### C) Location meublée — Micro-BIC

```
SI recettesLocatives <= 77 700€ :
  revenuImposable = recettes × (1 - 0.50)       // = 50% des recettes
  IR = baremeIR(revenuGlobal + revenuImposable, parts)
  PS = revenuImposable × 17,2%                   // ou 18,6% selon interprétation
```

#### D) Location meublée — Régime réel LMNP

```
chargesDeductibles = taxeFonciere + assurancePNO + travauxDeductibles
                   + fraisGestion + chargesCopropriete + interetsEmprunt
                   + fraisComptable

amortissementTotal = amortissementBien + amortissementMobilier + amortissementTravaux

resultatAvantAmortissement = recettes - chargesDeductibles

SI resultatAvantAmortissement > 0 :
  // L'amortissement ne peut PAS créer de déficit
  amortissementImpute = min(amortissementTotal, resultatAvantAmortissement)
  amortissementReportable = amortissementTotal - amortissementImpute
  resultatFiscal = resultatAvantAmortissement - amortissementImpute
SINON :
  resultatFiscal = resultatAvantAmortissement  // Déficit BIC
  amortissementReportable = amortissementTotal // Intégralement reporté

IR = baremeIR(revenuGlobal + max(0, resultatFiscal), parts)
PS = max(0, resultatFiscal) × 17,2%
```

#### E) Détection LMP

```
SI recettesLocativesMeublees > 23_000 
   ET recettesLocativesMeublees > autresRevenusActivite :
  → Alerte "Statut LMP" dans le résultat
  → Mentionner : cotisations sociales SSI (~40%) au lieu de PS (17,2%)
  → Mentionner : imputation déficit sur revenu global (avantage)
  → Mentionner : exonération plus-value après 5 ans si recettes < 90 000€
```

### 3.5 Calcul IR (barème progressif)

```typescript
function calculerIR(revenuImposable: number, nombreParts: number): number {
  const quotient = revenuImposable / nombreParts;
  let impotParPart = 0;

  for (const tranche of IR_BRACKETS_2026) {
    if (quotient <= tranche.min) break;
    const base = Math.min(quotient, tranche.max) - tranche.min;
    impotParPart += base * tranche.rate;
  }

  return Math.round(impotParPart * nombreParts);
}
```

---

## 4. Interface utilisateur

### 4.1 Parcours utilisateur

1. **Accès** : `/account/tax-simulator` (feature-gated `TAX_SIMULATOR`)
2. **Pré-remplissage** : Si le propriétaire a des biens dans Coridor, proposer de charger les données réelles (loyers, charges depuis `ExpenseService`, type de bail)
3. **Saisie complémentaire** : Revenus du foyer, nombre de parts, charges non trackées dans Coridor
4. **Résultat** : Comparaison côte à côte des régimes éligibles avec mise en avant du régime optimal

### 4.2 Écran principal

```
┌─────────────────────────────────────────────────────┐
│  Simulateur fiscal                                   │
│                                                       │
│  [Votre situation]                                    │
│  Revenus annuels du foyer (hors locatif) : [______]  │
│  Nombre de parts fiscales : [__]                      │
│                                                       │
│  [Vos biens locatifs]                                 │
│  ┌─ Bien 1 : 42 rue des Lilas (pré-rempli) ────────┐│
│  │ Type : ○ Location nue  ● Meublée                 ││
│  │ Loyers annuels : 12 000 €                        ││
│  │ Charges déductibles : [détail ▼]                  ││
│  │   Taxe foncière : 1 200 €                        ││
│  │   Intérêts emprunt : 2 400 €                     ││
│  │   Assurance PNO : 180 €                          ││
│  │   Travaux : 0 €                                   ││
│  │   Charges copro : 600 €                           ││
│  │   Frais gestion : 240 €                           ││
│  │   Amortissement bien : 3 500 €  (meublé)         ││
│  │   Amortissement mobilier : 800 € (meublé)        ││
│  └──────────────────────────────────────────────────┘│
│  [+ Ajouter un bien]                                  │
│                                                       │
│  [Calculer →]                                         │
└─────────────────────────────────────────────────────┘
```

### 4.3 Écran résultat

```
┌───────────────────────────────────────────────────────────────┐
│  Résultat — Comparaison des régimes                           │
│                                                                │
│  ★ Régime optimal : Réel LMNP (économie de 1 840 €/an)       │
│                                                                │
│  ┌──────────────┬──────────────┐                               │
│  │  Micro-BIC   │  Réel LMNP ★ │                               │
│  ├──────────────┼──────────────┤                               │
│  │ Base : 6 000€│ Base : 2 280€│                               │
│  │ IR : 1 800€  │ IR : 684€    │                               │
│  │ PS : 1 032€  │ PS : 392€    │                               │
│  │ Total: 2 832€│ Total: 1 076€│                               │
│  │ Taux : 23,6% │ Taux : 9,0%  │                               │
│  └──────────────┴──────────────┘                               │
│                                                                │
│  ⚠️ Alertes :                                                  │
│  • Le régime réel vous engage pour 2 ans minimum              │
│  • Vos recettes meublées sont sous le seuil LMP (23 000€)    │
│                                                                │
│  ℹ️ Ce simulateur donne une estimation indicative.             │
│  Il ne constitue pas un conseil fiscal. Consultez un           │
│  expert-comptable pour votre situation personnelle.            │
└───────────────────────────────────────────────────────────────┘
```

### 4.4 Mentions obligatoires dans l'UI

L'écran de résultat DOIT afficher :
- **Disclaimer** : "Simulation indicative — ne constitue pas un conseil fiscal"
- **Année de référence** : "Barème IR 2026 (revenus 2025)"
- **Lien** : "Consultez un expert-comptable pour votre situation personnelle"
- **Date de mise à jour des constantes** : visible dans les settings ou le footer

---

## 5. Constantes à jour — Résumé des sources légales

| Constante | Valeur 2025-2026 | Source légale |
|-----------|-----------------|---------------|
| Abattement micro-foncier | 30% | CGI art. 32 |
| Seuil micro-foncier | 15 000€ | CGI art. 32 |
| Abattement micro-BIC (longue durée) | 50% | CGI art. 50-0 |
| Seuil micro-BIC (longue durée) | 77 700€ | CGI art. 50-0 |
| Abattement micro-BIC (tourisme non classé) | 30% | Loi Le Meur 2024-1039 |
| Seuil micro-BIC (tourisme non classé) | 15 000€ | Loi Le Meur 2024-1039 |
| Déficit foncier — plafond revenu global | 10 700€ | CGI art. 156-I-3° |
| Déficit foncier — rénov énergie (→31/12/2025) | 21 400€ | LFR 2022, art. 12 |
| Déficit foncier — report | 10 ans | CGI art. 156-I-3° |
| Seuil LMP | 23 000€ + > autres revenus | CGI art. 155-IV |
| PS revenus fonciers | 17,2% | CSS (CSG 9,2% + CRDS 0,5% + sol. 7,5%) |
| PS revenus BIC LMNP | 17,2% (ou 18,6% selon interprétation LFSS 2026) | À confirmer |
| Réintégration amortissements LMNP | Depuis 14/02/2025 | LF 2025 art. 24, CGI art. 150 VB |
| Engagement réel foncier | 3 ans | CGI art. 32 |
| Engagement réel BIC | 2 exercices | CGI art. 50-0 |
| Option réel micro-foncier | Libre retour (pas d'engagement) | CGI art. 32 |

---

## 6. Points d'attention pour l'implémentation

### 6.1 Approche constantes

```
lib/fiscalRules.ts
├── IR_BRACKETS_2026          // Barème IR
├── PRELEVEMENTS_SOCIAUX      // Taux PS
├── LOCATION_NUE              // Seuils et abattements
├── LOCATION_MEUBLEE          // Seuils et abattements
├── LMP                       // Seuils LMP
├── DEFICIT_FONCIER           // Plafonds et durées
├── REINTEGRATION_AMORTISSEMENTS // Info LMNP
└── FISCAL_YEAR               // "2026" — pour affichage
```

Chaque constante est commentée avec :
- La source légale (article du CGI, loi, décret)
- La date de dernière vérification
- Le comportement attendu si la valeur change

### 6.2 Multi-biens

Le simulateur agrège les revenus de tous les biens du même type :
- Revenus fonciers (nus) = somme de tous les biens nus
- Revenus BIC (meublés) = somme de tous les biens meublés
- Le seuil micro-foncier (15 000€) s'applique au TOTAL des revenus fonciers
- Le seuil micro-BIC (77 700€) s'applique au TOTAL des recettes meublées
- Un propriétaire peut avoir des biens nus ET meublés simultanément

### 6.3 Pré-remplissage depuis Coridor

Si le propriétaire a des biens enregistrés :
1. Charger le type de bail depuis `Lease.type` → déterminer nu/meublé
2. Charger le loyer mensuel × 12 depuis `Listing.price`
3. Charger les dépenses par catégorie depuis `Expense` via `FiscalService.generateFiscalSummary()`
4. Les données manquantes (revenus du foyer, parts, amortissements) sont saisies manuellement

### 6.4 Feature gate

```typescript
// Le simulateur est protégé par le feature flag TAX_SIMULATOR
// Accessible aux plans : Essentiel, Pro
// Les locataires n'y ont pas accès
```

### 6.5 Tests

Cas de test critiques :
1. **Micro-foncier basique** : 10 000€ de loyers, TMI 30% → IR 2 100€ + PS 1 204€
2. **Réel avec déficit** : 10 000€ loyers, 25 000€ charges (dont 5 000€ intérêts) → déficit 15 000€, imputation 10 000€ sur revenu global, report 5 000€
3. **Micro-BIC vs Réel LMNP** : 12 000€ recettes, 8 000€ charges + 4 000€ amortissement → micro = 6 000€ base, réel = 0€ base
4. **Seuil LMP** : 25 000€ recettes meublées, 20 000€ salaires → alerte LMP
5. **Multi-biens mixtes** : 1 bien nu + 1 bien meublé → double calcul

---

## 7. Évolutions V2+

- Calcul de la plus-value à la revente (avec réintégration amortissements LMNP)
- Projection pluriannuelle (simulation sur 5-10 ans avec report déficit/amortissement)
- Comparaison nu vs meublé pour un même bien (aide à la décision type de bail)
- Export PDF de la simulation
- Intégration Loc'Avantages / dispositifs incitatifs
- Statut bailleur privé (si adopté — proposition de loi en cours)

---

## 8. Prompt d'implémentation (Claude Code)

### Teammate 1 : Backend (fiscalRules + TaxSimulatorService)

```
Implémente le simulateur fiscal pour Coridor.

## Fichier 1 : lib/fiscalRules.ts
Crée un fichier contenant TOUTES les constantes fiscales 2025-2026. 
Chaque constante DOIT être commentée avec sa source légale (article CGI, loi, décret).
Utilise les valeurs exactes documentées dans docs/FEATURE-TAX-SIMULATOR.md §2.

Structure :
- IR_BRACKETS_2026 (barème IR 5 tranches)
- PRELEVEMENTS_SOCIAUX (taux PS par type de revenu)  
- LOCATION_NUE (seuils micro-foncier + abattement)
- LOCATION_MEUBLEE (seuils micro-BIC + abattements, longue durée uniquement)
- LMP_THRESHOLDS (seuils LMP)
- DEFICIT_FONCIER (plafonds + durées report)
- FISCAL_YEAR = "2026"

## Fichier 2 : services/TaxSimulatorService.ts
Service stateless avec les méthodes :
- simuler(input: SimulationInput): SimulationResult
- calculerMicroFoncier(biens, revenuGlobal, parts)
- calculerReelFoncier(biens, revenuGlobal, parts) — avec gestion complète du déficit foncier
- calculerMicroBIC(biens, revenuGlobal, parts)
- calculerReelLMNP(biens, revenuGlobal, parts) — avec amortissement (ne crée pas de déficit)
- calculerIR(revenuImposable, parts) — barème progressif
- detecterLMP(recettesMeublees, autresRevenus) — retourne alerte si seuils dépassés
- determinerRegimeOptimal(regimes) — compare et recommande

Le service doit :
- Agréger les biens par type (nu/meublé) pour les seuils
- Gérer les cas multi-biens
- Produire des alertes pertinentes (seuil LMP, engagement durée réel, déficit reportable)
- Ne JAMAIS dépasser le périmètre d'une estimation indicative

## Fichier 3 : app/api/tax-simulator/route.ts
POST route qui :
- Authentifie l'utilisateur
- Vérifie le feature flag TAX_SIMULATOR
- Valide l'input (zod)
- Appelle TaxSimulatorService.simuler()
- Retourne le résultat

Interfaces TypeScript : voir docs/FEATURE-TAX-SIMULATOR.md §3.3

Intégration existante :
- Réutilise FiscalService.ts pour les données de dépenses existantes
- Le feature flag TAX_SIMULATOR existe déjà dans la DB (seedé)
- Utilise hasFeature() de lib/features.ts pour le gate

Zero TypeScript errors. Pas de données hardcodées en dehors de fiscalRules.ts.
```

### Teammate 2 : Frontend (TaxSimulatorClient)

```
Crée l'interface du simulateur fiscal pour Coridor.

## Page : app/[locale]/account/tax-simulator/page.tsx + TaxSimulatorClient.tsx

L'interface doit :

1. FORMULAIRE DE SAISIE
   - Section "Votre situation" : revenus annuels du foyer (hors locatif), nombre de parts fiscales (avec aide contextuelle pour le calcul des parts)
   - Section "Vos biens" : liste dynamique de biens avec pour chacun :
     - Type : Location nue / Meublée (radio)
     - Loyers annuels bruts
     - Détail charges (accordéon dépliable) : taxe foncière, intérêts emprunt, assurance PNO, travaux, charges copro, frais gestion
     - Si meublé : amortissement bien, mobilier, travaux (avec tooltip explicatif)
   - Bouton "+ Ajouter un bien"
   - Si l'utilisateur a des biens dans Coridor : bouton "Charger depuis mes biens" qui pré-remplit depuis l'API

2. PRÉ-REMPLISSAGE
   - Appel GET /api/properties pour lister les biens
   - Appel GET /api/fiscal/summary?propertyId=X&year=2025 pour les dépenses
   - Mapping automatique : Lease.type → nu/meublé, Listing.price × 12 → loyers

3. RÉSULTAT
   - Appel POST /api/tax-simulator
   - Affichage côte à côte des régimes éligibles (cards)
   - Mise en avant du régime optimal (badge, bordure colorée)
   - Pour chaque régime : base imposable, IR, PS, total, taux effectif
   - Section alertes (jaune) si applicable
   - Disclaimer obligatoire en bas

4. STYLE
   - Cohérent avec le reste de Coridor (shadcn/ui, Tailwind)
   - Responsive mobile
   - Animations de transition entre saisie et résultat
   - Tooltips explicatifs sur les termes techniques (TMI, abattement, amortissement, déficit foncier)

5. NAVIGATION
   - Ajouter le lien dans le sidebar account (section "Finance" avec le dashboard existant)
   - Feature-gated avec FeatureGate + UpgradePrompt si non éligible

Ne crée PAS de composants séparés pour les sous-sections — tout dans TaxSimulatorClient.tsx sauf si ça dépasse 600 lignes, auquel cas split logiquement.

Zero TypeScript errors.
```

### Teammate 3 : Docs + Backlog

```
Mets à jour la documentation :

1. BACKLOG.md — Ajoute "Simulateur fiscal propriétaire" dans la section features complétées avec un résumé des fichiers créés et des capacités

2. Crée docs/FEATURE-TAX-SIMULATOR.md si pas déjà présent (le fichier spec devrait déjà être dans docs/)

3. Vérifie que le seed des features inclut bien TAX_SIMULATOR avec les bons plans (Essentiel + Pro)
```
