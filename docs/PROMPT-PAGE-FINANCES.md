# Page Finances Consolidée — `/finances`

## Contexte

Les données financières du propriétaire sont actuellement éclatées par bien. Pour voir ses dépenses il faut naviguer dans chaque bien individuellement. Il n'existe aucune vue consolidée. Les KPIs du dashboard refondé (Revenus, Loyers, Dépenses) ne sont pas cliquables faute de page de destination.

**Objectif :** créer une page `/finances` qui centralise toute la vie financière du propriétaire. C'est la page où il fait ses comptes, suit ses loyers, ajoute ses dépenses, et exporte pour son comptable. Les KPIs du dashboard deviennent des liens vers cette page.

**Inspirations design :** Qonto (vue transactions), Mercury (dashboard financier), Stripe Dashboard (revenus + graphiques), Revolut Business (vue consolidée multi-comptes).

---

## ORGANISATION EN TEAM AGENTS

### Agent 1 — UX/Design (Maquettes, interactions, responsive, animations)

**Mission :** Définir l'architecture d'information de la page, le layout responsive (mobile-first), les interactions (sélecteur de mois, onglets, filtres), les micro-animations, et s'assurer que chaque donnée est compréhensible en 2 secondes. S'inspirer des meilleurs dashboards fintech. Chaque composant doit être pensé mobile d'abord puis adapté desktop.

**Responsabilités :**
- Architecture de la page (zones, hiérarchie visuelle)
- Comportement du sélecteur de mois (navigation, indicateur mois courant)
- Toggle Mois / Année
- Design des onglets et transitions
- Responsive : comment chaque section se comporte sur mobile vs desktop
- Micro-interactions : hover, tap, transitions entre onglets, animations de chargement
- Cohérence avec le design system du dashboard refondé (rounded-2xl, shadow-sm, couleurs fonctionnelles)

### Agent 2 — Backend (Server actions, requêtes, agrégation)

**Mission :** Créer les server actions et API routes qui agrègent les données financières de tous les biens. Requêtes optimisées (Promise.all), données pré-calculées côté serveur pour minimiser le travail client.

**Fichiers à produire/modifier :**
- `app/actions/getFinancialOverview.ts` — **Nouveau**
- `app/[locale]/finances/page.tsx` — **Nouveau**
- `app/api/expenses/quick-add/route.ts` — **Nouveau** (ajout rapide depuis la page finances)

### Agent 3 — Frontend Composants (UI, graphiques, tableaux)

**Mission :** Implémenter les composants de la page finances selon les specs UX de l'Agent 1. Tableaux, graphiques, formulaires, filtres.

**Fichiers à produire :**
- `app/[locale]/finances/FinancesClient.tsx` — **Nouveau**
- `components/finances/MonthSelector.tsx` — **Nouveau**
- `components/finances/RevenueTab.tsx` — **Nouveau**
- `components/finances/RentTrackingTab.tsx` — **Nouveau**
- `components/finances/ExpensesTab.tsx` — **Nouveau**
- `components/finances/CashflowSummary.tsx` — **Nouveau**
- `components/finances/AnnualView.tsx` — **Nouveau**
- `components/finances/QuickAddExpense.tsx` — **Nouveau**

### Agent 4 — Intégration (Dashboard links, navigation, export, sidebar)

**Mission :** Brancher les KPIs du dashboard vers la page finances, ajouter la page dans la navigation/sidebar, intégrer l'export existant, gérer le skeleton loader.

**Fichiers à modifier :**
- `components/dashboard/MonthlyKPIs.tsx` — Rendre cliquable
- `components/account/AccountSidebar.tsx` — Ajouter lien Finances
- Navigation mobile — Ajouter accès
- `app/[locale]/finances/loading.tsx` — **Nouveau** skeleton

---

## AGENT 1 — UX/DESIGN

### Architecture de la page

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  HEADER                                                     │
│  "Finances" + Sélecteur de mois  [ ◀ Mars 2026 ▶ ]        │
│                                    [ Mois | Année ]         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  RÉSUMÉ DU MOIS (3 cards)                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │ Revenus  │ │ Loyers   │ │ Dépenses │                    │
│  │ 729 €    │ │ 0/1 reçu │ │ 0 €      │                    │
│  │ attendus │ │ 1 retard │ │ ce mois  │                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
│                                                             │
│  CASHFLOW NET : +729 €                                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ONGLETS                                                    │
│  [ Revenus ]  [ Loyers ]  [ Dépenses ]                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Contenu de l'onglet sélectionné                    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [ Exporter PDF ]  [ Exporter CSV ]                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**En mode ANNÉE :**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  HEADER                                                     │
│  "Finances" + Sélecteur année   [ ◀ 2026 ▶ ]              │
│                                    [ Mois | Année ]         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  RÉSUMÉ ANNUEL (3 cards)                                    │
│  Revenus totaux | Dépenses totales | Cashflow net           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  GRAPHIQUE TRÉSORERIE (le graphique existant)               │
│  Barres revenus + barres dépenses mois par mois             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TABLEAU ANNUEL                                             │
│  Mois | Revenus | Dépenses | Cashflow | Occupation          │
│  Jan  | 729 €   | 120 €   | +609 €   | 1/12               │
│  Fév  | 729 €   | 0 €     | +729 €   | 1/12               │
│  ...                                                        │
│  TOTAL | 8748 € | 320 €  | +8428 €  |                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [ Exporter PDF ]  [ Exporter CSV ]                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Sélecteur de mois — MonthSelector

```
      [ ◀ ]    Mars 2026    [ ▶ ]
```

- Flèches gauche/droite pour naviguer mois par mois (ou année par année en mode Année)
- Le mois/année affiché est cliquable → ouvre un picker calendrier (mois + année)
- **Indicateur mois courant :** quand on n'est PAS sur le mois en cours, afficher un badge discret "Voir le mois en cours →" en lien sous le sélecteur. Quand on EST sur le mois en cours, afficher un petit point ou "Mois en cours" en `text-xs text-emerald-500`
- Swipe gauche/droite sur mobile pour naviguer (gesture naturelle)
- Animation : le contenu de la page fait un slide horizontal subtil quand on change de mois (150ms)

### Toggle Mois / Année

```
  ┌────────────────────┐
  │  [ Mois ] | Année  │
  └────────────────────┘
```

- Pill toggle segmented control
- Le segment actif a un fond (`bg-neutral-900 text-white` ou `bg-white shadow-sm` selon le style)
- Quand on switch : le contenu en dessous transitionne (fade ou slide)
- Sur mobile : le toggle est compact, aligné à droite du sélecteur de mois

### Onglets Revenus / Loyers / Dépenses

- Style : pills underline (trait sous l'onglet actif) — pas de fond, juste le texte bold + trait
- Transition du trait : slide horizontal smooth (200ms)
- Compteur sur chaque onglet si pertinent : "Loyers (1)" si 1 en retard, "Dépenses (3)" si 3 dépenses ce mois
- Sur mobile : les 3 onglets tiennent sur une ligne (texte court)
- Le contenu de l'onglet fade-in quand on switch (100ms)

### Résumé du mois — 3 cards

Identiques aux KPIs du dashboard mais avec plus de détail :

**Revenus :**
```
┌────────────────────────┐
│  Revenus               │
│                        │
│  729 €                 │
│  ━━━━━━━━━━━━━━━░░░░░  │
│  sur 729 € attendus   │
│  1 bien · 100% perçu  │
└────────────────────────┘
```

**Loyers :**
```
┌────────────────────────┐
│  Loyers                │
│                        │
│  0/1 reçu             │
│  ━━━━━░░░░░░░░░░░░░░░  │
│  🔴 1 en retard       │
│                        │
└────────────────────────┘
```

**Dépenses :**
```
┌────────────────────────┐
│  Dépenses              │
│                        │
│  0 €                   │
│                        │
│  ce mois               │
│  [ + Ajouter ]         │
└────────────────────────┘
```

- Barre de progression sur Revenus (reçu / attendu) et Loyers (payés / total)
- Bouton "+ Ajouter" discret sur la card Dépenses → ouvre le formulaire QuickAddExpense
- Mobile : scroll horizontal snap (comme le dashboard)

### Cashflow summary

Sous les 3 cards, une ligne de cashflow :

```
  Cashflow net ce mois : +729 €   (Revenus - Dépenses)
```

- Positif : `text-emerald-600 font-semibold`
- Négatif : `text-red-600 font-semibold`
- Discret, une ligne, centré

### Responsive mobile

- **Header** : "Finances" à gauche, sélecteur de mois centré, toggle Mois/Année à droite (ou en dessous si ça tient pas)
- **3 cards** : scroll horizontal snap, `min-w-[200px]` chaque card
- **Onglets** : pleine largeur, texte centré
- **Tableaux** : scroll horizontal si nécessaire, ou reformatés en cards empilées
- **Boutons export** : sticky en bas ou dans un menu "..." en haut à droite
- **QuickAddExpense** : bottom sheet (pas modale) sur mobile

### Micro-interactions

- Changement de mois : contenu slide left/right (150ms ease)
- Changement d'onglet : contenu fade (100ms)
- Toggle Mois/Année : contenu fade-crossover (200ms)
- Hover sur une ligne du tableau : `bg-neutral-50` (desktop uniquement)
- Tap sur une ligne : navigation vers le détail
- Count-up sur les montants au chargement (`useCountUp` existant)
- Barre de progression : animation de remplissage (500ms ease-out)

---

## AGENT 2 — BACKEND

### Server action `getFinancialOverview.ts`

```typescript
interface FinancialOverviewParams {
  userId: string;
  month: number;     // 1-12
  year: number;
}

interface FinancialOverview {
  // Résumé du mois
  monthly: {
    expectedRent: number;        // somme loyers attendus (baux actifs)
    receivedRent: number;        // somme loyers reçus
    rentProgress: number;        // 0-1
    paidCount: number;
    totalCount: number;
    overdueCount: number;
    expenses: number;            // somme dépenses du mois
    cashflow: number;            // receivedRent - expenses
  };

  // Détail par bien (onglet Revenus)
  revenueByProperty: {
    propertyId: string;
    propertyTitle: string;
    address: string;
    expectedRent: number;
    receivedRent: number;
    status: 'PAID' | 'PENDING' | 'OVERDUE' | 'VACANT';
    tenantName?: string;
    daysOverdue?: number;
  }[];

  // Suivi loyers (onglet Loyers)
  rentTracking: {
    id: string;
    propertyTitle: string;
    tenantName: string;
    amount: number;
    dueDate: string;
    paidDate?: string;
    status: 'PAID' | 'PENDING' | 'OVERDUE' | 'LATE';
    daysOverdue?: number;
    conversationId?: string;     // pour le lien "Voir la conversation"
  }[];

  // Dépenses (onglet Dépenses)
  expenses: {
    id: string;
    propertyTitle: string;
    propertyId: string;
    category: string;
    description?: string;
    amount: number;
    date: string;
    isRecoverable: boolean;
    recoverableRatio: number;
    isDeductible: boolean;
  }[];

  // Résumé annuel (mode Année)
  annual?: {
    monthlyBreakdown: {
      month: number;
      revenue: number;
      expenses: number;
      cashflow: number;
      occupiedUnits: number;
      totalUnits: number;
    }[];
    totalRevenue: number;
    totalExpenses: number;
    totalCashflow: number;
  };

  // Métadonnées
  properties: {
    id: string;
    title: string;
  }[];  // pour le filtre par bien dans l'onglet dépenses
}
```

**Requêtes (toutes en Promise.all) :**

```typescript
const [leases, rentTrackings, expenses, properties] = await Promise.all([
  // Baux actifs ce mois pour les revenus attendus
  prisma.lease.findMany({
    where: {
      property: { ownerId: userId },
      status: 'SIGNED',
      startDate: { lte: endOfMonth },
      OR: [{ endDate: null }, { endDate: { gte: startOfMonth } }],
    },
    include: {
      property: { select: { id: true, title: true, street: true, city: true } },
      tenant: { select: { firstName: true, lastName: true } },
      financials: { orderBy: { effectiveFrom: 'desc' }, take: 1 },
    },
  }),

  // Suivi des paiements du mois
  prisma.rentPaymentTracking.findMany({
    where: {
      lease: { property: { ownerId: userId } },
      dueDate: { gte: startOfMonth, lte: endOfMonth },
    },
    include: {
      lease: {
        include: {
          property: { select: { title: true } },
          tenant: { select: { firstName: true, lastName: true } },
        },
      },
    },
  }),

  // Dépenses du mois
  prisma.expense.findMany({
    where: {
      property: { ownerId: userId },
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    include: {
      property: { select: { id: true, title: true } },
    },
    orderBy: { date: 'desc' },
  }),

  // Liste des biens (pour le filtre)
  prisma.property.findMany({
    where: { ownerId: userId },
    select: { id: true, title: true },
    orderBy: { title: 'asc' },
  }),
]);
```

**Pour la vue annuelle :** requête supplémentaire qui agrège par mois sur l'année entière. Utiliser un `groupBy` Prisma ou calculer côté serveur à partir des données mensuelles.

### API `POST /api/expenses/quick-add`

Endpoint simplifié pour ajouter une dépense depuis la page finances :

```typescript
// Body
{
  propertyId: string;
  category: string;          // ExpenseCategory enum
  amount: number;            // en centimes
  date: string;              // ISO date
  description?: string;
  isRecoverable: boolean;
  recoverableRatio: number;  // 0-100
}

// Réutilise la même logique que l'API expenses existante
// Mais accessible depuis /finances sans naviguer dans le bien
```

---

## AGENT 3 — FRONTEND COMPOSANTS

### FinancesClient.tsx — Composant principal

Gère l'état : mois sélectionné, mode (mois/année), onglet actif, données.

```typescript
interface FinancesClientProps {
  initialData: FinancialOverview;
  initialMonth: number;
  initialYear: number;
}

// States
const [month, setMonth] = useState(initialMonth);
const [year, setYear] = useState(initialYear);
const [mode, setMode] = useState<'month' | 'year'>('month');
const [activeTab, setActiveTab] = useState<'revenue' | 'rent' | 'expenses'>('revenue');

// SWR pour recharger quand le mois change
const { data } = useSWR(`/api/finances?month=${month}&year=${year}`, fetcher, {
  fallbackData: initialData,
});
```

### MonthSelector.tsx

Props : `month`, `year`, `mode`, `onChange`, `onModeChange`

- Navigation flèches ◀ ▶ 
- Affichage : "Mars 2026" en mode mois, "2026" en mode année
- Badge "Mois en cours" ou "Voir le mois en cours →"
- Toggle segmented Mois / Année
- Swipe gesture sur mobile (optionnel, via touch events)

### RevenueTab.tsx — Onglet Revenus

Tableau ventilé par bien :

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Bien                  Locataire    Attendu   Reçu   Statut │
│  ──────────────────────────────────────────────────────────  │
│  Appt Levallois        Michelle S.  729 €     0 €    🔴     │
│  Studio Rivoli         —            —         —      Vacant │
│  T3 Bastille           Jean D.      1200 €    1200 € ✅     │
│  ...                                                        │
│  ──────────────────────────────────────────────────────────  │
│  TOTAL                              1929 €    1200 €        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- Ligne cliquable → page du bien
- Statut : ✅ Payé (vert), ⏳ En attente (ambre), 🔴 En retard (rouge), — Vacant (gris)
- Ligne total en bas en `font-semibold`
- Mobile : reformater en cards empilées (pas de tableau horizontal)

**Mobile :**
```
┌──────────────────────────────────┐
│  Appt Levallois                  │
│  Michelle S.                     │
│  729 € attendus · 0 € reçu     │
│  🔴 En retard                   │
└──────────────────────────────────┘
```

### RentTrackingTab.tsx — Onglet Loyers

Focus sur le suivi des paiements avec actions :

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  🔴 En retard                                               │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Appt Levallois · Michelle S.                         │  │
│  │  729 € · Dû le 5 mars · 12 jours de retard           │  │
│  │                                                       │  │
│  │  [ Envoyer un rappel ]  [ Voir la conversation → ]    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ✅ Payés                                                    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  T3 Bastille · Jean D.                                │  │
│  │  1200 € · Payé le 3 mars                              │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- Groupé par statut : "En retard" en haut (rouge), puis "En attente" (ambre), puis "Payés" (vert)
- Les retards ont des boutons d'action : "Envoyer un rappel" + "Voir la conversation"
- "Envoyer un rappel" → crée un message dans la conversation (réutiliser la logique RentCollectionService existante)
- "Voir la conversation" → lien vers `/inbox/[conversationId]`
- Les payés sont affichés mais plus discrets (texte gris)

### ExpensesTab.tsx — Onglet Dépenses

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  [ + Ajouter une dépense ]        Filtre: [ Tous les biens ▼ ] │
│                                                              │
│  5 mars · Appt Levallois                                     │
│  Plomberie · Réparation fuite                    -180 €      │
│  Récupérable 100%                                            │
│                                                              │
│  3 mars · T3 Bastille                                        │
│  Assurance · Prime annuelle PNO                  -540 €      │
│  Déductible                                                  │
│                                                              │
│  1 mars · Appt Levallois                                     │
│  Charges · Provisions sur charges                 -200 €     │
│  Récupérable 100%                                            │
│                                                              │
│  ──────────────────────────────────────────────────────────  │
│  Total dépenses : 920 €                                      │
│  Dont récupérable : 380 € · Dont déductible : 540 €         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- Bouton "+ Ajouter une dépense" en haut → ouvre QuickAddExpense
- Filtre par bien : dropdown avec "Tous les biens" + liste des biens
- Chaque dépense : date, bien, catégorie, description, montant
- Tags : "Récupérable" (bleu), "Déductible" (vert)
- Total en bas avec ventilation récupérable/déductible
- Chaque ligne cliquable → ouvre la dépense en édition (modale ou inline)

### QuickAddExpense.tsx — Formulaire ajout rapide

Bottom sheet sur mobile, modale sur desktop :

```
┌──────────────────────────────────────┐
│  Ajouter une dépense                │
│                                      │
│  Bien *                              │
│  [ Appt Levallois           ▼ ]     │
│                                      │
│  Catégorie *                         │
│  [ Plomberie                ▼ ]     │
│                                      │
│  Montant * (€)                       │
│  [ 180                         ]     │
│                                      │
│  Date                                │
│  [ 05/03/2026                  ]     │
│                                      │
│  Description (optionnel)             │
│  [ Réparation fuite SdB       ]     │
│                                      │
│  ☐ Récupérable sur le locataire     │
│    Ratio : [ 100 ] %                │
│                                      │
│  [ Annuler ]        [ Ajouter → ]   │
│                                      │
└──────────────────────────────────────┘
```

- Sélecteur de bien obligatoire (dropdown avec les biens du proprio)
- Catégorie : réutiliser l'enum ExpenseCategory existant
- Montant en euros (conversion centimes côté API)
- Date pré-remplie avec aujourd'hui
- Toggle récupérable + ratio
- Après ajout : la dépense apparaît immédiatement dans la liste (optimistic update)
- Le formulaire se ferme et un toast confirme "Dépense ajoutée"

### AnnualView.tsx — Vue annuelle

Affichée quand le toggle est sur "Année" :

- Résumé annuel en haut : 3 cards (Revenus totaux, Dépenses totales, Cashflow net)
- Le graphique de trésorerie existant (CashflowChart) importé tel quel
- Tableau mensuel : Mois | Revenus | Dépenses | Cashflow | Occupation
- Ligne de total en bas
- Mobile : le tableau devient des cards par mois (empilées)

### CashflowSummary.tsx — Ligne cashflow

Simple composant qui affiche :

```
  Cashflow net : +729 €
```

- Positif : `text-emerald-600`
- Négatif : `text-red-600`
- Zéro : `text-neutral-400`
- `text-lg font-semibold text-center`

---

## AGENT 4 — INTÉGRATION

### KPIs du dashboard → liens

Modifier `components/dashboard/MonthlyKPIs.tsx` :

```typescript
// Chaque card KPI devient un lien
<Link href="/fr/finances?tab=revenue">
  <div className="... cursor-pointer hover:border-neutral-300 hover:shadow-md transition-all">
    {/* Card Revenus */}
  </div>
</Link>

<Link href="/fr/finances?tab=rent">
  <div className="...">
    {/* Card Loyers */}
  </div>
</Link>

<Link href="/fr/finances?tab=expenses">
  <div className="...">
    {/* Card Dépenses */}
  </div>
</Link>
```

- Le `?tab=` pré-sélectionne l'onglet à l'arrivée sur la page
- Hover : `hover:border-neutral-300 hover:shadow-md` pour signifier que c'est cliquable
- Mobile : le tap suffit, pas besoin de hover visuel

### Navigation sidebar

Ajouter dans `AccountSidebar.tsx` (section "Financier") :

```typescript
{ 
  label: 'Finances', 
  href: '/finances', 
  icon: BarChart3,  // ou Wallet, ou PiggyBank
}
```

Le placer en haut de la section "Financier", avant "Récap fiscal" et "Simulateur".

### Export

Intégrer les boutons d'export existants (`FiscalReportDocument` PDF + CSV) dans la page finances. Deux boutons en bas de page :

- "Exporter PDF" → génère le rapport fiscal pour le mois ou l'année sélectionné
- "Exporter CSV" → export tableur du mois ou de l'année

Réutiliser les API existantes (`/api/accounting/export`) en passant les paramètres de mois/année.

### Skeleton loader

Créer `app/[locale]/finances/loading.tsx` avec :
- Skeleton du header + sélecteur de mois
- 3 cards skeleton (KPIs)
- Skeleton des onglets
- 5-6 lignes skeleton (tableau)

### Query params

La page finances accepte des query params pour le deep linking :

- `?tab=revenue|rent|expenses` — onglet pré-sélectionné
- `?month=3&year=2026` — mois pré-sélectionné
- `?mode=year` — vue annuelle

Quand le proprio clique sur "1 en retard" dans le dashboard, le lien est : `/finances?tab=rent&month=3&year=2026`

---

## FICHIERS RÉCAPITULATIF

### Nouveaux (11)

| Fichier | Agent | Rôle |
|---------|-------|------|
| `app/actions/getFinancialOverview.ts` | 2 | Server action agrégation données |
| `app/[locale]/finances/page.tsx` | 2 | Page server |
| `app/[locale]/finances/FinancesClient.tsx` | 3 | Client principal |
| `app/[locale]/finances/loading.tsx` | 4 | Skeleton |
| `components/finances/MonthSelector.tsx` | 3 | Navigation mois/année |
| `components/finances/RevenueTab.tsx` | 3 | Onglet revenus |
| `components/finances/RentTrackingTab.tsx` | 3 | Onglet loyers |
| `components/finances/ExpensesTab.tsx` | 3 | Onglet dépenses |
| `components/finances/CashflowSummary.tsx` | 3 | Ligne cashflow net |
| `components/finances/AnnualView.tsx` | 3 | Vue annuelle + graphique |
| `components/finances/QuickAddExpense.tsx` | 3 | Bottom sheet ajout dépense |

### Modifiés (4)

| Fichier | Agent | Modification |
|---------|-------|-------------|
| `components/dashboard/MonthlyKPIs.tsx` | 4 | Wrapper Link vers /finances?tab= |
| `components/account/AccountSidebar.tsx` | 4 | Ajouter lien Finances |
| Navigation mobile | 4 | Ajouter accès Finances |
| `app/api/expenses/` ou nouvelle route | 2 | Quick-add endpoint |

### Composants existants réutilisés (non modifiés)

- `CashflowChart` — importé dans AnnualView
- `useCountUp` — animation des montants
- API `/api/accounting/export` — boutons export PDF/CSV

---

## VÉRIFICATIONS

### Agent 1 — UX
- [ ] Hiérarchie : résumé → onglets → détail → export (dans cet ordre)
- [ ] Sélecteur de mois : navigation intuitive, indicateur mois courant visible
- [ ] Toggle Mois/Année : bascule fluide, contenu adapté
- [ ] Mobile : cards en scroll snap, tableaux en cards empilées, bottom sheet pour ajout
- [ ] Aucune donnée ambiguë (pas de "Taux de recouvrement 0%")
- [ ] Chaque montant compréhensible en 2 secondes

### Agent 2 — Backend
- [ ] getFinancialOverview : retourne toutes les données en une seule requête (Promise.all)
- [ ] Revenus par bien : attendu vs reçu vs statut pour chaque bien
- [ ] Suivi loyers : groupé par statut (retard, attente, payé)
- [ ] Dépenses : toutes catégories, filtrable par bien
- [ ] Vue annuelle : breakdown mensuel avec totaux
- [ ] Quick-add expense : fonctionne, crée la dépense, calcul déductible auto

### Agent 3 — Composants
- [ ] RevenueTab : tableau desktop, cards mobile, total en bas
- [ ] RentTrackingTab : groupé par statut, boutons action sur les retards
- [ ] ExpensesTab : filtre par bien, bouton ajouter, tags récupérable/déductible
- [ ] AnnualView : graphique existant + tableau mensuel
- [ ] QuickAddExpense : bottom sheet mobile, modale desktop, optimistic update
- [ ] Transitions : slide mois, fade onglets, count-up montants
- [ ] Dark mode : tous les composants

### Agent 4 — Intégration
- [ ] KPIs dashboard cliquables : Revenus → ?tab=revenue, Loyers → ?tab=rent, Dépenses → ?tab=expenses
- [ ] KPIs dashboard : hover visible (border + shadow)
- [ ] Sidebar : lien Finances ajouté dans la section Financier
- [ ] Query params : tab, month, year, mode fonctionnent
- [ ] Export : boutons PDF/CSV fonctionnels
- [ ] Skeleton : cohérent avec le layout final
- [ ] npm run build → 0 erreurs
