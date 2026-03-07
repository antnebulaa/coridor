# Refonte Dashboard Propriétaire — Action-first, Mobile-first, Fintech-grade

## Contexte

Le dashboard propriétaire actuel est un "beau foutoir" : 6 KPIs en ligne qui noient l'info, un graphique de trésorerie annuel en plein milieu, des sections mélangées sans hiérarchie d'importance, des données contradictoires ("Tous les loyers sont à jour" + "Taux de recouvrement : 0%"), et un design hétérogène (cards jaunes, bandeau jaune, tailles différentes).

**Objectif :** transformer le dashboard en outil opérationnel quotidien, pas en rapport financier. Le proprio se connecte le matin, il voit en 3 secondes s'il a quelque chose à faire, combien il a gagné ce mois, et si tout va bien.

**Principes :**
1. **Action-first** — ce qui requiert une action remonte en haut, ce qui est informatif descend
2. **Mobile-first** — la majorité des proprios consultent sur téléphone. Le desktop s'adapte, pas l'inverse
3. **Design fintech unifié** — s'inspirer des meilleurs dashboards fintech (Revolut, N26, Qonto, Mercury, Stripe). Typographie claire, espacement généreux, couleurs fonctionnelles (pas décoratives), cards cohérentes
4. **Pas de destruction** — les KPIs et graphiques existants sont déplacés/réorganisés, pas supprimés. Ils doivent rester disponibles pour une future page "Finances/Reporting"

---

## ORGANISATION EN TEAM AGENTS

### Agent 1 — Architecture & Données (Server actions, logique de priorisation)

**Mission :** Restructurer les server actions du dashboard pour fournir les données organisées par priorité d'action. Créer la logique de messages contextuels dynamiques, de priorisation des alertes, et de calcul des KPIs mensuels.

**Fichiers à modifier :**
- `app/actions/getDashboardAlerts.ts` — Enrichir avec priorisation
- `app/actions/getOperationalStats.ts` — Ajouter les stats mensuelles
- `app/[locale]/dashboard/page.tsx` — Restructurer les données passées au client

### Agent 2 — Composants UI (Cards, KPIs, Design system)

**Mission :** Créer les nouveaux composants du dashboard avec un design fintech unifié. Cards d'action urgente, KPIs mensuels, liste des biens avec statut, section finances dépliable. Tout en mobile-first.

**Fichiers à produire :**
- `components/dashboard/DashboardHeader.tsx` — **Nouveau**
- `components/dashboard/ActionCards.tsx` — **Nouveau**
- `components/dashboard/MonthlyKPIs.tsx` — **Nouveau**
- `components/dashboard/PropertyStatusList.tsx` — **Nouveau**
- `components/dashboard/FinanceSection.tsx` — **Nouveau** (wrapper pour les KPIs/graphiques existants)

### Agent 3 — Intégration & Polish (Layout, responsive, transitions, unification)

**Mission :** Assembler les composants dans le dashboard, gérer le responsive mobile-first, unifier le design (couleurs, spacing, border-radius, shadows), ajouter les transitions et animations subtiles. S'assurer que les anciens composants (KPIs, graphiques) sont préservés et déplacés dans FinanceSection.

**Fichiers à modifier :**
- `app/[locale]/dashboard/DashboardClient.tsx` — Refonte complète du layout
- Vérification de cohérence mobile sur tous les composants

---

## AGENT 1 — ARCHITECTURE & DONNÉES

### Message contextuel dynamique

Remplacer le message statique "Les affaires reprennent !" par un message basé sur les données réelles :

```typescript
function getDashboardMessage(data: DashboardData): string {
  // Priorité 1 — Alertes urgentes
  if (data.overdueRents > 0)
    return `${data.overdueRents} loyer${data.overdueRents > 1 ? 's' : ''} en retard`;
  if (data.urgentReminders > 0)
    return `${data.urgentReminders} rappel${data.urgentReminders > 1 ? 's' : ''} légal${data.urgentReminders > 1 ? 'aux' : ''} à traiter`;

  // Priorité 2 — Actions en attente
  if (data.pendingApplications > 0)
    return `${data.pendingApplications} candidature${data.pendingApplications > 1 ? 's' : ''} à examiner`;
  if (data.upcomingVisits > 0)
    return `${data.upcomingVisits} visite${data.upcomingVisits > 1 ? 's' : ''} à venir`;
  if (data.pendingEdl > 0)
    return `Un état des lieux à finaliser`;

  // Priorité 3 — Positif
  if (data.allRentsPaid)
    return 'Tous les loyers sont à jour 👍';
  if (data.occupancyRate === 100)
    return 'Tous vos biens sont occupés 🎉';

  // Défaut
  return 'Votre tableau de bord';
}
```

### Actions urgentes — Données priorisées

Créer une fonction qui agrège et priorise les actions :

```typescript
interface ActionItem {
  id: string;
  type: 'OVERDUE_RENT' | 'LEGAL_REMINDER' | 'PENDING_APPLICATION' | 'PENDING_EDL' | 'UPCOMING_VISIT' | 'DEPOSIT_DEADLINE' | 'UNSIGNED_LEASE';
  priority: 'URGENT' | 'ACTION' | 'INFO';
  title: string;
  subtitle: string;
  href: string;
  propertyName?: string;
  daysLeft?: number;
}

// Trier par priorité : URGENT > ACTION > INFO
// Au sein d'une même priorité : par daysLeft (le plus urgent d'abord)
```

Types d'actions et leur priorité :
- **URGENT (rouge)** : loyers en retard > 15 jours, rappels légaux dépassés, deadline dépôt de garantie dépassé
- **ACTION (ambre)** : candidatures à examiner, EDL en cours, visites à confirmer, bail à signer, loyers en retard < 15 jours
- **INFO (bleu)** : visites à venir cette semaine, rappels légaux à venir dans 30 jours

### KPIs mensuels

Au lieu des KPIs annuels, calculer les données du mois en cours :

```typescript
interface MonthlyKPIs {
  // Revenus du mois
  expectedRent: number;       // loyers attendus ce mois (somme des baux actifs)
  receivedRent: number;       // loyers effectivement reçus
  rentProgress: number;       // receivedRent / expectedRent (0-1)
  
  // Occupation
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  
  // Dépenses du mois
  monthlyExpenses: number;
  
  // Cash net du mois
  monthlyCashflow: number;    // receivedRent - monthlyExpenses
}
```

### Statut par bien

Pour chaque bien, fournir un résumé compact :

```typescript
interface PropertyStatus {
  id: string;
  title: string;
  address: string;
  imageUrl?: string;
  status: 'OCCUPIED' | 'VACANT' | 'PENDING_LEASE';
  tenantName?: string;          // prénom + initiale
  rentStatus: 'PAID' | 'PENDING' | 'OVERDUE' | 'NO_LEASE';
  rentAmount?: number;
  nextAction?: string;          // "Loyer en attente", "Candidature à traiter", etc.
  nextActionHref?: string;
}
```

---

## AGENT 2 — COMPOSANTS UI

### Design system unifié

Avant de créer les composants, définir les règles de design à respecter sur TOUTE la page :

**Palette fonctionnelle (pas de jaune décoratif) :**
- Fond page : `bg-neutral-50` (light) / `bg-neutral-950` (dark)
- Cards : `bg-white rounded-2xl border border-neutral-100 shadow-sm` (light) / `bg-neutral-900 border-neutral-800` (dark)
- Urgent : `bg-red-50 border-red-200 text-red-700`
- Action requise : `bg-amber-50 border-amber-200 text-amber-700`
- Succès : `text-emerald-600` (pas de fond, juste le texte/icône)
- Info : `text-neutral-500`

**Typographie :**
- Titres sections : `text-lg font-semibold text-neutral-900`
- KPIs gros chiffres : `text-3xl font-bold text-neutral-900 tabular-nums`
- Labels : `text-sm text-neutral-500`
- Valeurs : `text-sm font-medium text-neutral-900`

**Spacing :**
- Gap entre sections : `gap-6` (mobile) / `gap-8` (desktop)
- Padding cards : `p-5` (mobile) / `p-6` (desktop)
- Aucune card jaune décorative — les couleurs ont une fonction (rouge = urgent, ambre = action, vert = ok)

**Icônes :** Lucide React exclusivement, taille 20px pour les cards, 16px pour les items de liste.

### DashboardHeader.tsx

```
┌──────────────────────────────────────────┐
│                                          │
│  Bonjour Adrien                          │
│  3 candidatures à examiner               │
│                                          │
│  12 logements · 1 occupé                 │
│                                     [+]  │
└──────────────────────────────────────────┘
```

- "Bonjour [Prénom]" en `text-2xl font-bold`
- Message contextuel dynamique en `text-base text-neutral-500`
- Stats inline : "X logements · Y occupés" en `text-sm text-neutral-400`
- Bouton "+" flottant (mobile) ou "Ajouter un bien" (desktop) aligné à droite
- Pas d'emoji dans le titre (le 👋 fait pas fintech)
- Pas de bandeau "Données en cours de consolidation" — si les données sont partielles, mettre un petit `(i)` tooltip sur le KPI concerné

### ActionCards.tsx — Actions urgentes

Section conditionnelle — n'apparaît QUE s'il y a des actions. Si tout va bien, cette section est remplacée par une ligne discrète "✅ Tout est en ordre" en `text-sm text-emerald-600`.

```
┌──────────────────────────────────────────┐
│  🔴 1 loyer en retard                   │
│  Appartement Levallois · Michelle S.     │
│  15 jours de retard             Voir →   │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  🟡 3 candidatures à examiner           │
│  Appartement Levallois          Voir →   │
│  Studio 2ème étage              Voir →   │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  🟡 EDL en cours                        │
│  Appartement Levallois · 1/5 pièces     │
│                            Reprendre →   │
└──────────────────────────────────────────┘
```

**Design :**
- Card urgente (rouge) : `bg-red-50 border border-red-200 rounded-2xl p-5`
- Card action (ambre) : `bg-amber-50 border border-amber-200 rounded-2xl p-5`
- Pastille de couleur à gauche du titre (●) : `w-2 h-2 rounded-full bg-red-500` ou `bg-amber-500`
- Lien "Voir →" aligné à droite, `text-sm font-medium`
- Les cards sont cliquables entièrement (pas juste le lien)
- Mobile : les cards prennent toute la largeur, empilées verticalement
- Maximum 5 action cards visibles, au-delà "Voir toutes les actions (X)" en lien

### MonthlyKPIs.tsx — KPIs du mois

3 KPIs simples, gros et lisibles :

```
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│                │ │                │ │                │
│  Revenus       │ │  Loyers        │ │  Dépenses      │
│                │ │                │ │                │
│  2 680 €       │ │  3/4 reçus     │ │  320 €         │
│  sur 3 560 €   │ │  ████████░░    │ │  ce mois       │
│  attendus      │ │                │ │                │
│                │ │                │ │                │
└────────────────┘ └────────────────┘ └────────────────┘
```

**Design :**
- 3 cards côte à côte sur desktop, empilées sur mobile (ou scroll horizontal si on veut garder la compacité mobile)
- Chaque card : `bg-white rounded-2xl border border-neutral-100 shadow-sm p-5`
- Label : `text-sm text-neutral-500 mb-1`
- Valeur principale : `text-3xl font-bold text-neutral-900 tabular-nums`
- Sous-texte : `text-sm text-neutral-400 mt-1`
- Card "Loyers" : barre de progression (`bg-emerald-500` pour reçus, `bg-neutral-200` pour en attente) + "X/Y reçus" en texte
- Si tout est reçu : barre verte complète + petit ✅
- Si impayé : barre avec portion rouge + texte rouge "1 en retard"
- Pas de pourcentages de variation (↗ 40.9% etc.) — ça ne veut rien dire sans contexte et ça surcharge

**Mobile :** les 3 KPIs en scroll horizontal (snap scroll) ou en grille 1 colonne. Le scroll horizontal est plus fintech (Revolut, N26 font ça).

### PropertyStatusList.tsx — Mes biens

Liste de tous les biens avec statut rapide :

```
┌──────────────────────────────────────────────────────────┐
│  Mes biens                                               │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ [📸]  Appartement Levallois                      │    │
│  │       17 Rue Jules Guesde · 2 pièces · 45m²      │    │
│  │       🟢 Occupé · Michelle S.                    │    │
│  │       Loyer : 1 700 € · ✅ Payé                  │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ [📸]  Studio Indépendant (2ème étage)            │    │
│  │       Rue de Rivoli · Studio · 25m²               │    │
│  │       🔴 Vacant                                   │    │
│  │       3 candidatures                              │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ [📸]  T3 Bastille                                │    │
│  │       Rue de la Roquette · 3 pièces · 65m²        │    │
│  │       🟢 Occupé · Jean D.                        │    │
│  │       Loyer : 1 200 € · ⚠️ En attente            │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Design :**
- Titre section : `text-lg font-semibold`
- Chaque bien : card avec mini-photo à gauche (48x48 rounded-lg), infos à droite
- Statut occupation : pastille + texte (`🟢 Occupé · [Prénom]` / `🔴 Vacant` / `🟡 Bail en cours`)
- Statut loyer : `✅ Payé` (vert) / `⚠️ En attente` (ambre) / `❌ En retard` (rouge) / rien si vacant
- Card entière cliquable → page du bien
- Mobile : les cards prennent toute la largeur, pas de photo (gain de place) ou photo très petite

### FinanceSection.tsx — Section finances (dépliable)

**C'est ici que les KPIs et graphiques existants sont déplacés.** Pas supprimés, pas recréés — juste wrappés dans un conteneur dépliable en bas du dashboard.

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  📊 Finances & Reporting                    [Déplier ▼]  │
│                                                          │
│  ── Quand déplié : ─────────────────────────────────     │
│                                                          │
│  [Les 6 KPIs existants — Cashflow, Revenus,              │
│   Manque à Gagner, Rendement Brut, Rendement Net,        │
│   Dépenses — TELS QUELS, pas de modification]            │
│                                                          │
│  [Le graphique Flux de Trésorerie Mensuel                │
│   — TEL QUEL, pas de modification]                       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Implémentation :**
- Conteneur avec un state `isExpanded` (default: false)
- Header cliquable : "Finances & Reporting" + chevron
- Animation : hauteur 0 → auto avec transition (300ms ease)
- Les composants existants (KPIs row, graphique trésorerie) sont simplement rendus à l'intérieur du conteneur quand `isExpanded === true`
- **NE PAS modifier les composants KPI et graphique existants** — les importer et les rendre tels quels
- Plus tard, ils pourront être déplacés dans une page `/finances` dédiée

**Mobile :** la section est fermée par défaut. Le proprio qui veut voir les finances la déplie. Ça libère l'espace pour les infos opérationnelles.

---

## AGENT 3 — INTÉGRATION & POLISH

### Layout du dashboard — DashboardClient.tsx

Restructurer complètement l'ordre d'affichage :

```
┌─────────────────────────────────────────────┐
│  DashboardHeader                            │  ← Zone 1
│  Bonjour Adrien · Message contextuel        │
│  12 logements · 1 occupé             [+]    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  ActionCards (conditionnel)                  │  ← Zone 2
│  🔴 Loyer en retard                        │
│  🟡 Candidatures à traiter                 │
│  🟡 EDL en cours                           │
│  (ou "✅ Tout est en ordre" si rien)        │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  MonthlyKPIs                                │  ← Zone 3
│  [Revenus]  [Loyers X/Y]  [Dépenses]       │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  PropertyStatusList                         │  ← Zone 4
│  [Bien 1 — Occupé — Loyer payé]            │
│  [Bien 2 — Vacant — 3 candidatures]        │
│  [Bien 3 — Occupé — Loyer en attente]      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  FinanceSection (dépliable, fermé)          │  ← Zone 5
│  📊 Finances & Reporting          [▼]      │
└─────────────────────────────────────────────┘
```

**Desktop (md+) :**
- Layout max-width `max-w-5xl mx-auto`
- Zone 3 (KPIs) : grille 3 colonnes
- Zone 4 (Biens) : grille 2 colonnes si > 4 biens, sinon 1 colonne
- Zone 5 (Finances) : pleine largeur

**Mobile :**
- Tout empilé en 1 colonne
- Zone 3 (KPIs) : scroll horizontal snap ou grille 1 colonne
- Zone 4 (Biens) : 1 colonne, cards compactes
- Padding : `px-4` partout
- Les cards d'action sont swipeable si > 3 (optionnel)

### Suppression du bandeau "Données en cours de consolidation"

Supprimer complètement. Si un KPI est basé sur des données partielles, ajouter un petit `(i)` tooltip sur le KPI en question, pas un bandeau global qui décrédibilise toute la page.

### Suppression du "Simulateur d'investissement" CTA

Retirer le CTA jaune du dashboard. C'est un outil ponctuel, pas opérationnel. Il est déjà accessible depuis la sidebar/menu. Pareil pour "Besoin d'aide ?" — c'est du footer.

### Correction "Taux de recouvrement : 0%"

Remplacer par un libellé clair :
- Si aucun impayé : ne rien afficher (le "✅ Tous les loyers sont à jour" suffit)
- Si impayés en cours : "X impayé(s) en cours de recouvrement"

### Unification des cards

Toutes les cards du dashboard doivent avoir le même design :
- `bg-white rounded-2xl border border-neutral-100 shadow-sm` (light)
- `bg-neutral-900 rounded-2xl border border-neutral-800` (dark)
- Padding : `p-5` mobile, `p-6` desktop
- Pas de fond jaune, pas de fond coloré sauf pour les alertes (rouge/ambre)
- Coins : `rounded-2xl` partout (pas de mix rounded-lg et rounded-xl)
- Ombres : `shadow-sm` partout (subtile, pas de shadow-lg)

### Transitions et animations

- Les action cards apparaissent avec un fade-in stagger (100ms entre chaque)
- Les KPIs font un count-up au chargement (utiliser le hook `useCountUp` existant du simulateur)
- La barre de progression des loyers s'anime de 0 à la valeur réelle (500ms ease-out)
- Le déplier de FinanceSection : transition hauteur smooth (300ms)
- Pas d'animations lourdes — tout doit être subtil et rapide

### Pull-to-refresh (mobile natif Capacitor)

Si l'app tourne dans Capacitor, ajouter un pull-to-refresh natif sur le dashboard pour recharger les données. Utiliser le pattern existant ou le plugin `@capacitor/haptics` pour le feedback tactile au pull.

---

## FICHIERS RÉCAPITULATIF

### Nouveaux (5)

| Fichier | Agent | Rôle |
|---------|-------|------|
| `components/dashboard/DashboardHeader.tsx` | 2 | Header avec message contextuel |
| `components/dashboard/ActionCards.tsx` | 2 | Actions urgentes conditionnelles |
| `components/dashboard/MonthlyKPIs.tsx` | 2 | 3 KPIs du mois |
| `components/dashboard/PropertyStatusList.tsx` | 2 | Liste biens avec statut |
| `components/dashboard/FinanceSection.tsx` | 2 | Wrapper dépliable pour KPIs/graphiques existants |

### Modifiés (4)

| Fichier | Agent | Modification |
|---------|-------|-------------|
| `app/actions/getDashboardAlerts.ts` | 1 | Priorisation actions, message contextuel |
| `app/actions/getOperationalStats.ts` | 1 | Stats mensuelles, statut par bien |
| `app/[locale]/dashboard/page.tsx` | 1 | Restructurer données passées au client |
| `app/[locale]/dashboard/DashboardClient.tsx` | 3 | Refonte complète layout, intégration composants |

### Composants existants préservés (déplacés dans FinanceSection)

Les composants suivants ne sont PAS modifiés, juste importés dans FinanceSection :
- Le composant qui affiche les 6 KPIs (Cashflow, Revenus, etc.)
- Le graphique "Flux de Trésorerie Mensuel"
- Le widget "Opérations" (Taux d'occupation, Candidatures, Visites)

**Identifier ces composants dans DashboardClient.tsx actuel et les extraire dans FinanceSection sans modification.**

### Composants supprimés du dashboard (pas de l'app)

- Bandeau "Données en cours de consolidation"
- CTA "Simulateur d'investissement" (reste accessible depuis le menu)
- "Besoin d'aide ?" (reste accessible depuis le menu/footer)

---

## VÉRIFICATIONS

### Agent 1
- [ ] Message contextuel : change selon les données (impayés > candidatures > tout ok)
- [ ] Actions priorisées : URGENT avant ACTION avant INFO
- [ ] KPIs mensuels : revenus du mois, loyers X/Y, dépenses du mois
- [ ] Statut par bien : occupation + loyer + prochaine action
- [ ] Données existantes préservées (rien de cassé dans les server actions)

### Agent 2
- [ ] DashboardHeader : message contextuel, pas d'emoji, stats inline
- [ ] ActionCards : n'apparaît que s'il y a des actions, disparaît sinon
- [ ] ActionCards : rouge pour urgent, ambre pour action, max 5 visibles
- [ ] MonthlyKPIs : 3 cards, gros chiffres, barre progression loyers
- [ ] MonthlyKPIs : pas de pourcentages de variation sans contexte
- [ ] PropertyStatusList : mini-photo, statut occupation, statut loyer
- [ ] FinanceSection : dépliable, fermé par défaut, contient les composants existants TELS QUELS
- [ ] Design unifié : mêmes border-radius, shadows, padding, couleurs partout
- [ ] Mobile : scroll horizontal KPIs ou empilé, cards pleine largeur

### Agent 3
- [ ] Layout : Header → Actions → KPIs → Biens → Finances (dans cet ordre)
- [ ] Bandeau "consolidation" supprimé
- [ ] CTA simulateur supprimé du dashboard
- [ ] "Besoin d'aide" supprimé du dashboard
- [ ] "Taux de recouvrement : 0%" supprimé ou reformulé
- [ ] Toutes les cards : même design (rounded-2xl, shadow-sm, border-neutral-100)
- [ ] Transitions : fade-in actions, count-up KPIs, barre progression animée
- [ ] Desktop : max-w-5xl, grilles 2-3 colonnes
- [ ] Mobile : 1 colonne, padding px-4, tout lisible sans scroll horizontal (sauf KPIs)
- [ ] Dark mode : tous les composants
- [ ] npm run build → 0 erreurs
- [ ] Les composants KPI et graphique existants sont intacts et rendus dans FinanceSection
