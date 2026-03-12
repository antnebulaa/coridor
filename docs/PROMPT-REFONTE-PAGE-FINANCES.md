# Refonte Page /finances — Outil financier intelligent, pas un rapport

## Contexte

La page `/finances` actuelle est un échec design et UX : 4 onglets incohérents (Revenus, Loyers, Dépenses, Fiscal), un bandeau KPI noir qui duplique le dashboard, un onglet Dépenses qui copie la page Dépenses & Charges en moins bien, aucune hiérarchie, aucune intelligence. Ça ressemble à un rapport Excel, pas à un outil fintech.

**Ce qu'on jette :**
- Les 4 onglets (Revenus, Loyers, Dépenses, Fiscal)
- Le bandeau KPI noir (Cashflow Net / Revenus / Dépenses)
- L'onglet Dépenses (doublon de la page Dépenses & Charges)
- Le sélecteur Mois/Année et le sélecteur de mois
- Toute action opérationnelle ("Envoyer un rappel", etc.) — ça c'est le dashboard

**Ce qu'on construit :** une page scrollable unique, organisée par besoins, vue ANNUELLE. Le proprio vient ici pour 3 raisons :
1. "Est-ce que je gagne de l'argent ?" → Résultat net, métriques de performance, comparatif
2. "Mes impôts" → Déclaration 2044, simulation fiscale
3. "Mes documents" → Quittances, exports comptables

**Inspirations benchmarkées :** Stessa (metrics dashboard, NOI, Schedule E auto-catégorisation), Baselane (balance sheet, equity nette, rent roll), Horiz.io (comparatif immobilier vs placements, plus-value estimée, rendement patrimonial).

**Prototype de référence :** le fichier `finances-v4-smart.jsx` dans le projet — c'est la maquette visuelle de référence. Ne pas copier le code tel quel mais respecter la structure, la hiérarchie et le design system.

**Design system :** reprendre EXACTEMENT le langage visuel du dashboard refondé — `rounded-2xl`, `border-neutral-100`, `shadow-sm`, DM Sans, couleurs fonctionnelles (rouge=alerte, vert=ok, ambre=attention), animations stagger, count-up sur les montants.

**Illustrations :** utiliser Open Doodles (https://opendoodles.s3-us-west-1.amazonaws.com/{name}.svg) pour les cards d'insights et les états vides. Les afficher en filigrane (opacity 40%, grayscale, positionnées en bas à droite de la card).

---

## ARCHITECTURE DE LA PAGE (scroll vertical unique)

```
┌──────────────────────────────────────────────┐
│  HEADER                                      │
│  "Finances" + bouton Export comptable         │
│  Sélecteur année : [2023] [2024] [2025]      │
├──────────────────────────────────────────────┤
│  ACCÈS RAPIDES (scroll horizontal)           │
│  [Quittances] [Dépenses & Charges]           │
│  [Régularisation charges]                    │
├──────────────────────────────────────────────┤
│  RÉSULTAT NET — Hero card                    │
│  +16 079 € (gros, vert/rouge)               │
│  Sparkline annuelle en haut à droite         │
│  Revenus bruts · Charges & dépenses          │
│  ──────────────────────────────              │
│  NOI · Rendement net (vs Livret A, SCPI)     │
│  Taux d'occupation                           │
│  ──────────────────────────────              │
│  Valeur patrimoine · Capital restant dû      │
│  Equity nette · Plus-value latente           │
├──────────────────────────────────────────────┤
│  RECOMMANDATIONS (insights contextuels)      │
│  🔴 5 biens sans locataire → Publier         │
│  🟣 Micro-foncier ou réel ? → Simuler        │
│  🔵 Trésorerie prévisionnelle → Détail       │
│  🟢 Prochain achat rentable ? → Simuler      │
│  🟡 Plus-value estimée → Détail par bien     │
│  (avec illustrations Open Doodles)           │
├──────────────────────────────────────────────┤
│  OCCUPATION (calendrier des baux)            │
│  [Bien 1 · locataire · bail → déc 2026]     │
│  [Bien 2 · vacant]                          │
│  [Bien 3 · vacant]                          │
│  + N autres biens → Voir tous               │
│  (barres 12 mois occupé/vacant par bien)     │
├──────────────────────────────────────────────┤
│  DÉCLARATION FISCALE (dépliable)             │
│  Déclaration 2044 — badge "Auto Powens"      │
│  Dropdown filtre par bien (pas des pills)    │
│  Tableau lignes 211-420                      │
│  Export PDF + CSV                            │
├──────────────────────────────────────────────┤
│  Lien vers Dépenses & Charges                │
└──────────────────────────────────────────────┘
```

---

## ORGANISATION EN TEAM AGENTS

### Agent 1 — Backend & Données (Server actions, calculs, agrégation)

**Mission :** Créer la server action `getFinancialReport.ts` qui agrège toutes les données financières annuelles de tous les biens du proprio. Calculer NOI, rendement, equity, plus-value, taux d'occupation, insights contextuels. Préparer les données de la déclaration 2044 avec catégorisation automatique Powens.

**Fichiers à produire/modifier :**
- `app/actions/getFinancialReport.ts` — **Nouveau**
- `app/actions/getFinancialInsights.ts` — **Nouveau**
- `app/[locale]/finances/page.tsx` — **Refonte complète**

### Agent 2 — Composants UI (Cards, métriques, graphiques, insights)

**Mission :** Créer tous les composants de la page finances. Design fintech unifié, mobile-first, animations stagger, Open Doodles sur les insights. S'inspirer strictement du prototype `finances-v4-smart.jsx`.

**Fichiers à produire :**
- `components/finances/FinancesHeader.tsx` — **Nouveau**
- `components/finances/QuickLinks.tsx` — **Nouveau**
- `components/finances/NetResultCard.tsx` — **Nouveau**
- `components/finances/Sparkline.tsx` — **Nouveau**
- `components/finances/MetricRow.tsx` — **Nouveau**
- `components/finances/InsightCard.tsx` — **Nouveau** (avec Open Doodles)
- `components/finances/OccupationSection.tsx` — **Nouveau**
- `components/finances/OccupationBar.tsx` — **Nouveau**
- `components/finances/FiscalSection.tsx` — **Nouveau**
- `components/finances/Declaration2044Table.tsx` — **Nouveau**

### Agent 3 — Intégration, Navigation & Polish

**Mission :** Assembler la page, brancher les liens depuis le dashboard, supprimer les anciens composants/onglets, gérer le responsive, les animations, le skeleton loader, le dark mode. Mettre à jour la navigation.

**Fichiers à modifier :**
- `app/[locale]/finances/FinancesClient.tsx` — **Refonte complète** (remplace l'ancien avec onglets)
- `components/dashboard/MonthlyKPIs.tsx` — Mettre à jour les liens
- `app/[locale]/finances/loading.tsx` — Skeleton loader
- Supprimer les anciens composants finances inutilisés (RevenueTab, RentTrackingTab, ExpensesTab, etc.)

### Agent 4 — Insights Engine (logique contextuelle)

**Mission :** Créer la logique qui génère les insights contextuels basés sur les données du proprio. Chaque insight a une condition d'affichage, un titre, une description avec des données interpolées, un CTA, une couleur, et une illustration Open Doodles.

**Fichiers à produire :**
- `lib/finances/insightsEngine.ts` — **Nouveau**
- `lib/finances/types.ts` — **Nouveau**

---

## AGENT 1 — BACKEND & DONNÉES

### Server action `getFinancialReport.ts`

```typescript
interface FinancialReportParams {
  userId: string;
  year: number;
}

interface FinancialReport {
  year: number;

  // === RÉSULTAT NET ===
  totalRevenue: number;       // loyers + charges encaissés sur l'année
  totalExpenses: number;      // toutes dépenses de l'année
  netResult: number;          // totalRevenue - totalExpenses
  noi: number;                // Net Operating Income (revenus - charges opérationnelles hors financement)
  noiTrend: number | null;    // variation vs année précédente en %

  // === RENDEMENT ===
  netYield: number;           // rendement net annuel en %
  netYieldTrend: number | null; // variation vs année précédente en points
  livretARate: number;        // taux Livret A de référence (pour comparaison)
  scpiRate: number;           // taux SCPI moyen de référence

  // === PATRIMOINE ===
  estimatedValue: number;     // valeur estimée totale (somme des biens)
  valueTrend: number | null;  // variation en %
  totalDebt: number;          // capital restant dû (tous emprunts)
  debtDetails: string | null; // ex: "Crédit Agricole · échéance 2038"
  netEquity: number;          // estimatedValue - totalDebt
  equityTrend: number | null;

  // === PLUS-VALUE ===
  totalPurchasePrice: number; // prix d'achat total
  grossCapitalGain: number;   // estimatedValue - totalPurchasePrice
  netCapitalGain: number;     // après estimation impôt sur plus-value

  // === OCCUPATION ===
  occupancyRate: number;      // % mois occupés / mois total
  occupiedMonths: number;
  totalMonths: number;

  // === CASHFLOW MENSUEL (pour sparkline) ===
  monthlyCashflow: { month: string; revenue: number; expense: number }[];

  // === OCCUPATION PAR BIEN ===
  properties: {
    id: string;
    title: string;
    address: string;
    tenantName: string | null;
    monthlyRent: number | null;
    occupiedMonths: number;
    totalMonths: number; // 12 ou moins si bien ajouté en cours d'année
    leaseEndDate: string | null;
    leaseMonthsRemaining: number | null;
    isVacant: boolean;
  }[];

  // === DÉCLARATION 2044 ===
  declaration2044: {
    ligne: string;
    description: string;
    montant: number;
    type: 'revenu' | 'charge' | 'total' | 'resultat';
    autoCategories: boolean; // true si catégorisé via Powens
  }[];
  hasPowensConnection: boolean;
}
```

**Logique de calcul :**

- **totalRevenue** : `SUM(Payment.amount WHERE status=PAID AND year=Y)` + charges encaissées
- **totalExpenses** : `SUM(Expense.amount WHERE year=Y)` pour tous les biens du proprio
- **NOI** : totalRevenue - (charges opérationnelles : taxe foncière, assurance, entretien, gestion) — exclure les intérêts d'emprunt
- **Rendement net** : `(netResult / estimatedValue) * 100` — si estimatedValue est renseignée, sinon `(netResult / totalPurchasePrice) * 100`
- **Equity nette** : si l'utilisateur a renseigné ses emprunts dans Coridor (ou via Powens), calculer `estimatedValue - capitalRestantDû`. Sinon, masquer la ligne
- **Plus-value** : si le prix d'achat est renseigné et qu'une estimation de valeur existe, calculer `estimatedValue - totalPurchasePrice`. Pour le net après impôts, appliquer le barème simplifié de l'impôt sur la plus-value immobilière (19% + 17.2% prélèvements sociaux, avec abattements par durée de détention)
- **Occupation** : pour chaque bien, compter les mois avec un bail actif sur l'année
- **Sparkline** : agréger par mois les revenus et dépenses pour les 12 mois de l'année
- **Déclaration 2044** : agréger les données existantes de dépenses par catégorie (lignes 211 à 420). Si Powens est connecté, marquer `autoCategories: true` sur les lignes alimentées automatiquement

**Requêtes :** utiliser `Promise.all` pour paralléliser les requêtes (paiements, dépenses, baux, biens, emprunts).

**Gestion des données manquantes :** si le proprio n'a pas renseigné le prix d'achat, la valeur estimée, ou les emprunts — ne pas afficher les lignes correspondantes (equity, plus-value). L'UI doit gérer gracieusement les `null`.

### Server action `getFinancialInsights.ts`

Prend en entrée un `FinancialReport` et retourne une liste d'insights contextuels triés par priorité. Voir Agent 4 pour la logique détaillée.

---

## AGENT 2 — COMPOSANTS UI

### Design system (rappel)

Identique au dashboard refondé :
- **Cards :** `bg-white rounded-2xl border border-neutral-100 shadow-sm`
- **Typographie :** DM Sans. Gros chiffres en `text-[34px] font-extrabold tabular-nums tracking-tight`. Labels en `text-xs text-neutral-500`. Section titles en `text-[10px] text-neutral-400 uppercase tracking-wider font-semibold`
- **Couleurs fonctionnelles :** positif = `text-emerald-600`, négatif = `text-red-500`, alerte = `bg-red-50 border-red-100`, attention = `bg-amber-50 border-amber-100`
- **Animations :** stagger fade-in au chargement (100ms entre chaque section), count-up sur les montants, sparkline qui se dessine progressivement
- **Spacing :** `gap-6` mobile, `gap-8` desktop. Padding cards `p-5`
- **Fond page :** `bg-[#FAFAF9]` (légèrement chaud, pas blanc pur)

### FinancesHeader.tsx

- "Finances" en `text-[22px] font-extrabold`
- Bouton "Export comptable" en haut à droite (icône download + texte)
- Année sélecteur : pills `[2023] [2024] [2025]`. Actif = `bg-neutral-900 text-white`, inactif = `bg-white text-neutral-400 border`
- L'année courante est sélectionnée par défaut. Si année incomplète, pas d'indication spéciale (les données sont simplement partielles)

### QuickLinks.tsx

Scroll horizontal, `overflow-x-auto`, gap-2. Chaque lien = mini card avec icône + label :
- Quittances → icône document, fond `bg-neutral-900` (icône blanche)
- Dépenses & Charges → icône $, fond `bg-orange-100` (icône orange)
- Régularisation charges → icône calculette, fond `bg-purple-100` (icône purple)

Chaque bouton navigue vers la page correspondante.

### NetResultCard.tsx

La card héro. Structure :
- En haut à gauche : label "Résultat net {year}" + montant géant (vert si positif, rouge si négatif)
- En haut à droite : composant `Sparkline` (cashflow mensuel, ~100×36px)
- En dessous, séparateur, puis liste de `MetricRow` :
  - Revenus bruts (avec sub "Loyers + charges encaissés")
  - Charges & dépenses
  - ─── séparateur ───
  - NOI avec trend badge
  - Rendement net avec sub "vs Livret A 3% · SCPI 4.5%" et trend badge
  - Taux d'occupation avec sub "X/Y mois occupés"
  - ─── séparateur ───
  - Valeur patrimoine avec trend (SI RENSEIGNÉ)
  - Capital restant dû avec sub "Banque · échéance" (SI RENSEIGNÉ)
  - Equity nette avec trend (SI RENSEIGNÉ)
  - Plus-value latente avec sub "Acheté X € · ~Y € net après impôts" (SI RENSEIGNÉ)

**Important :** les lignes patrimoine/equity/plus-value ne s'affichent QUE si le proprio a renseigné les données nécessaires. Pas de "0 €" si pas de données.

### Sparkline.tsx

SVG pur, pas de librairie. Props : `data: { v: number }[]`, `width`, `height`.
- Courbe `stroke="#10b981"` (emerald) si tendance positive, `stroke="#ef4444"` (red) si négative
- Aire sous la courbe avec gradient transparent
- Animation de dessin progressif (opacity fade-in 700ms)

### MetricRow.tsx

Ligne flex `justify-between`. Props : `label`, `value`, `sub?`, `trend?`, `good?`.
- Label à gauche en `text-xs text-neutral-500`, sub en `text-[10px] text-neutral-400`
- Value à droite en `text-sm font-semibold text-neutral-900 tabular-nums`
- Si trend : badge `text-[10px] font-semibold px-1.5 py-0.5 rounded-full`, vert si `good`, rouge sinon

### InsightCard.tsx

Props : `title`, `description`, `actionLabel`, `actionHref`, `color`, `doodleName`.

- Card avec fond coloré (`bg-{color}-50 border-{color}-100`)
- Texte à gauche avec `pr-16` (laisser de la place pour l'illustration)
- Illustration Open Doodles en position `absolute right-2 bottom-0`, taille `w-20 h-20`, `opacity-40`, `grayscale`, `pointer-events-none`
- CTA en bas : texte coloré + flèche →, hover = gap s'élargit
- L'URL de l'illustration : `https://opendoodles.s3-us-west-1.amazonaws.com/{doodleName}.svg`

**Doodles par type d'insight :**
- Vacance locative → `sitting.svg`
- Simulation fiscale → `reading.svg`
- Trésorerie prévisionnelle → `float.svg`
- Simulation investissement → `plant.svg`
- Plus-value → `meditating.svg`
- Renouvellement bail → `strolling.svg`
- État vide (pas de données) → `coffee.svg`

### OccupationSection.tsx

Section avec titre "Occupation {year}".
- Liste les biens avec :
  - Pastille vert/gris (occupé/vacant)
  - Nom du bien + loyer/mois à droite (ou badge "Vacant" rouge)
  - Adresse + locataire + badge date fin bail (ambre si < 6 mois, neutre sinon)
  - `OccupationBar` : 12 segments (mois), vert = occupé, gris = vacant
- Maximum 3 biens affichés par défaut. Au-delà : "+ N autres biens → Voir tous les biens" (lien vers la page biens ou accordéon)
- Desktop : si > 6 biens, grille 2 colonnes

### OccupationBar.tsx

Props : `months: number`, `occupied: number`.
Flex row de 12 petits segments `rounded-sm h-2 flex-1`. Les `occupied` premiers en `bg-emerald-400`, le reste en `bg-neutral-200`.

### FiscalSection.tsx

Section avec titre "Déclaration fiscale" + boutons CSV/PDF à droite.
- Card dépliable (fermée par défaut)
- En-tête : icône verte + "Déclaration 2044 — {year}" + résultat foncier + badge "Auto Powens" (si connecté)
- Chevron pour déplier
- Quand dépliée :
  - **Dropdown** de sélection du bien (pas des pills). `<select>` stylisé avec tous les biens + "Tous les biens"
  - `Declaration2044Table` en dessous
  - Footer : "Dépenses catégorisées automatiquement via Powens" (si connecté) + bouton CSV

### Declaration2044Table.tsx

Tableau simple en lignes. Chaque ligne :
- Numéro de ligne (211, 221, etc.) en `font-mono text-neutral-300`
- Description
- Montant aligné à droite, coloré : revenu en vert, charge en rouge, total en noir, résultat en vert gras
- Ligne "Résultat foncier" sur fond `bg-emerald-50/50`
- Ligne "Total des charges" sur fond `bg-neutral-50/50`

---

## AGENT 3 — INTÉGRATION & POLISH

### Layout de la page

Page unique scrollable. `max-w-lg mx-auto px-4 pb-28` (mobile-first).

Ordre de rendu :
1. `FinancesHeader` (stagger delay 50ms)
2. `QuickLinks` (stagger delay 100ms)
3. `NetResultCard` (stagger delay 150ms)
4. Section Insights (stagger delay 250ms)
5. `OccupationSection` (stagger delay 350ms)
6. `FiscalSection` (stagger delay 450ms)
7. Lien vers Dépenses & Charges (stagger delay 500ms)

Desktop (md+) : `max-w-3xl`, les insights pourraient passer en grille 2 colonnes.

### Liens depuis le dashboard

Mettre à jour `MonthlyKPIs.tsx` :
- KPI "Revenus" → `/finances` (page annuelle)
- KPI "Loyers" → `/finances` (page annuelle)
- KPI "Dépenses" → lien vers la page Dépenses & Charges existante (PAS vers /finances)

### Suppression des anciens composants

Supprimer les fichiers qui ne servent plus :
- `components/finances/RevenueTab.tsx`
- `components/finances/RentTrackingTab.tsx`
- `components/finances/ExpensesTab.tsx`
- `components/finances/CashflowSummary.tsx`
- `components/finances/MonthSelector.tsx` (plus de navigation par mois)
- Tout composant lié aux anciens onglets

**Attention :** vérifier que `AnnualView` et `QuickAddExpense` ne sont pas utilisés ailleurs avant de supprimer.

### Skeleton loader

`loading.tsx` : skeleton qui mime la structure de la page :
- Rectangle pour le header
- 3 petits rectangles en ligne pour les quick links
- Grande card rectangulaire pour le résultat net
- 3 cards rectangulaires pour les insights
- Cards pour l'occupation

Utiliser `animate-pulse bg-neutral-200 rounded-2xl`.

### Navigation

- L'item "Finances" dans la bottom nav pointe vers `/finances`
- Query param `?year=2024` pour ouvrir sur une année spécifique
- Le bouton Export comptable ouvre un dropdown avec les options d'export (PDF rapport annuel, CSV transactions)

### Animations

- Sections apparaissent en stagger (fade-in + translateY 8px → 0)
- Count-up sur le résultat net, NOI, equity (800ms ease-out-cubic)
- Sparkline : opacity 0 → 1 en 700ms
- Occupation bars : width 0% → X% en 500ms ease-out (avec 100ms de delay par bien)
- Fiscal section : expand/collapse avec `max-h` + `opacity` transition 300ms
- Changement d'année : tous les contenus refont un fade-in rapide (200ms)

---

## AGENT 4 — INSIGHTS ENGINE

### `lib/finances/insightsEngine.ts`

```typescript
interface FinancialInsight {
  id: string;
  priority: number;            // 1 = plus important
  color: 'red' | 'amber' | 'purple' | 'blue' | 'emerald';
  doodleName: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  condition: boolean;          // afficher ou non
}
```

**Insights et conditions d'affichage :**

| Priorité | Insight | Condition | Couleur | Doodle |
|----------|---------|-----------|---------|--------|
| 1 | "X biens sans locataire" | vacantCount > 0 | red | sitting |
| 2 | "Bail se termine dans X mois" | leaseMonthsRemaining <= 6 pour au moins 1 bien | amber | strolling |
| 3 | "Micro-foncier ou réel ?" | totalRevenue > 0 AND année en cours ou passée | purple | reading |
| 4 | "Trésorerie prévisionnelle" | totalExpenses > 0 (il y a des dépenses récurrentes) | blue | float |
| 5 | "Votre prochain achat est-il rentable ?" | toujours affiché | emerald | plant |
| 6 | "Plus-value estimée : +X €" | grossCapitalGain > 0 AND estimatedValue renseignée | amber | meditating |
| 7 | "Votre rendement bat le Livret A" | netYield > livretARate | emerald | jumping |

**Descriptions dynamiques (interpolées) :**

- Vacance : "Votre taux d'occupation global est de {occupancyRate}%. Chaque mois de vacance vous coûte environ {avgRent} € de manque à gagner."
- Bail : "Le bail de {tenantName} ({propertyTitle}) se termine dans {months} mois. Pensez au renouvellement ou à la remise en location."
- Fiscal : "Avec {totalRevenue} € de revenus fonciers, le régime réel vous ferait économiser environ {savings} € par rapport au micro-foncier." (calcul simplifié : si revenus < 15000, micro-foncier possible ; si charges > 30% des revenus, le réel est probablement plus intéressant)
- Trésorerie : "Sur les 12 prochains mois, vos dépenses récurrentes estimées s'élèvent à ~{projected} €. Prochaine échéance : {nextExpense}."
- Plus-value : "Votre patrimoine a pris {gainPercent}% de valeur. Après impôts et prélèvements, votre plus-value nette serait d'environ {netGain} €."

**Règles d'affichage :**
- Maximum 4 insights visibles par défaut
- Si plus de 4 : bouton "Voir plus de recommandations" qui déplie les suivants
- Trier par priorité (1 = plus important)
- Ne pas afficher un insight si sa condition est `false`

---

## FICHIERS RÉCAPITULATIF

### Nouveaux

| Fichier | Agent | Rôle |
|---------|-------|------|
| `app/actions/getFinancialReport.ts` | 1 | Server action données annuelles |
| `app/actions/getFinancialInsights.ts` | 1 | Server action insights contextuels |
| `lib/finances/insightsEngine.ts` | 4 | Logique de génération des insights |
| `lib/finances/types.ts` | 4 | Types partagés |
| `components/finances/FinancesHeader.tsx` | 2 | Header + sélecteur année |
| `components/finances/QuickLinks.tsx` | 2 | Accès rapides horizontal |
| `components/finances/NetResultCard.tsx` | 2 | Card héro résultat net |
| `components/finances/Sparkline.tsx` | 2 | SVG sparkline |
| `components/finances/MetricRow.tsx` | 2 | Ligne label/valeur/trend |
| `components/finances/InsightCard.tsx` | 2 | Card insight avec Open Doodle |
| `components/finances/OccupationSection.tsx` | 2 | Section occupation + baux |
| `components/finances/OccupationBar.tsx` | 2 | Barre 12 mois |
| `components/finances/FiscalSection.tsx` | 2 | Section déclaration fiscale |
| `components/finances/Declaration2044Table.tsx` | 2 | Tableau 2044 |
| `app/[locale]/finances/loading.tsx` | 3 | Skeleton loader |

### Modifiés

| Fichier | Agent | Modification |
|---------|-------|-------------|
| `app/[locale]/finances/page.tsx` | 1 | Refonte complète, nouvelle server action |
| `app/[locale]/finances/FinancesClient.tsx` | 3 | Refonte complète, plus d'onglets |
| `components/dashboard/MonthlyKPIs.tsx` | 3 | Mettre à jour liens (Revenus/Loyers → /finances, Dépenses → /depenses-charges) |

### Supprimés

| Fichier | Raison |
|---------|--------|
| `components/finances/RevenueTab.tsx` | Remplacé par page scrollable |
| `components/finances/RentTrackingTab.tsx` | Remplacé par OccupationSection |
| `components/finances/ExpensesTab.tsx` | Doublon, redirigé vers Dépenses & Charges |
| `components/finances/CashflowSummary.tsx` | Remplacé par NetResultCard |
| `components/finances/MonthSelector.tsx` | Plus de navigation mensuelle |

---

## VÉRIFICATIONS

### Agent 1
- [ ] Résultat net calculé correctement (revenus - dépenses)
- [ ] NOI exclut les intérêts d'emprunt
- [ ] Rendement net en % cohérent
- [ ] Equity = valeur patrimoine - capital restant dû
- [ ] Plus-value = valeur estimée - prix achat, avec estimation impôt
- [ ] Taux d'occupation calculé sur les mois avec bail actif
- [ ] Sparkline : 12 points de cashflow mensuel
- [ ] Déclaration 2044 : lignes correctement agrégées par catégorie
- [ ] Badge "Auto Powens" correct si connexion active
- [ ] Données manquantes → null (pas de 0 € trompeur)
- [ ] Promise.all pour paralléliser les requêtes

### Agent 2
- [ ] NetResultCard : gros chiffre vert/rouge, sparkline en haut à droite
- [ ] Métriques patrimoine masquées si données non renseignées
- [ ] "vs Livret A · SCPI" visible sous le rendement net
- [ ] InsightCard : illustration Open Doodle en filigrane à droite
- [ ] InsightCard : texte ne chevauche pas l'illustration (pr-16)
- [ ] OccupationBar : 12 segments animés
- [ ] Badge date fin bail : ambre si < 6 mois
- [ ] Fiscal dropdown (pas des pills) pour sélection du bien
- [ ] Maximum 3 biens visibles dans occupation, "+ N autres" si plus
- [ ] Count-up sur les montants
- [ ] Tous les composants : mobile-first, design system unifié

### Agent 3
- [ ] Page scrollable unique, pas d'onglets
- [ ] Stagger animations sur chaque section
- [ ] KPI dashboard "Revenus" → /finances
- [ ] KPI dashboard "Dépenses" → /depenses-charges (PAS /finances)
- [ ] Anciens composants onglets supprimés
- [ ] Skeleton loader cohérent avec le layout final
- [ ] Query param `?year=` fonctionnel
- [ ] Dark mode : tous les composants
- [ ] `npm run build` → 0 erreurs

### Agent 4
- [ ] Insights triés par priorité
- [ ] Maximum 4 affichés par défaut
- [ ] Descriptions interpolées avec les vraies données
- [ ] Insight vacance : coût estimé du manque à gagner
- [ ] Insight fiscal : calcul simplifié micro-foncier vs réel
- [ ] Insight bail : mois restants calculés correctement
- [ ] Insight plus-value : affiché uniquement si prix d'achat renseigné
- [ ] Conditions : pas d'insight affiché si condition = false
