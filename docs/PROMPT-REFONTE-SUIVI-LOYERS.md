# Refonte Page Suivi des Loyers — Vue mensuelle, actionnelle, premium

## Contexte

La page actuelle "Mes locations" est un échec UX : un accordéon par bien avec un tableau MOIS/ATTENDU/RECU/STATUT/ACTIONS qui déborde sur mobile, un bandeau Powens bleu qui casse le flow, une page vide et désorganisée même avec un seul bail. Le proprio ne peut pas scanner en 2 secondes si ses locataires ont payé.

**Ce qu'on jette :**
- L'accordéon "Mes locations" avec le tableau horizontal
- Le titre "Mes locations — Vos baux signés et le suivi des loyers"
- Le tableau avec colonnes MOIS/ATTENDU/RECU/STATUT/ACTIONS
- Le bandeau Powens bleu

**Ce qu'on construit :** une page **mensuelle** (pas annuelle) qui répond à une seule question : "Est-ce que mes locataires m'ont payé ce mois-ci ?" Vue par défaut groupée par bien, avec toggle vers une vue liste plate. Toutes les actions (relancer, marquer payé, quittance) se font dans un bottom sheet, pas dans la liste.

**Prototype de référence :** le fichier `suivi-loyers-v3.jsx` dans le projet. Respecter la structure, la hiérarchie, le design system et les principes UX décrits ci-dessous.

**Design system :** identique au dashboard refondé et à la page /finances — `rounded-2xl`, `border-neutral-200`, `shadow-sm`, DM Sans, fond `#FAFAF9`, couleurs fonctionnelles via les status pills uniquement (pas de bordures colorées, pas de fonds rouges sur les cards).

---

## PRINCIPES UX CRITIQUES

Ces principes sont **non-négociables**. Ils corrigent des erreurs cognitives identifiées lors des tests.

### 1. La barre de progression est TOUJOURS verte
L'encaissement est une victoire. L'argent qui rentre = positif = vert (`bg-emerald-500`). Jamais rouge, même s'il y a des impayés. Le rouge sur une jauge d'encaissement fait paniquer le cerveau en pensant "dette" au lieu de "progression".

### 2. Le décompte en haut est exhaustif
Ne pas afficher "3/6 payés + 2 impayés" (le cerveau fait 3+2=5, il manque 1). Afficher trois pills distinctes qui font le compte complet :
- `3 payés` (pill verte)
- `1 partiel` (pill ambre)
- `2 retards` (pill rouge)

### 3. Le paiement partiel affiche le RESTE DÛ en premier
Pour Sarah K. qui a payé 300 sur 450 : afficher **"Reste 150 €"** en montant principal (ambre), avec "sur 450 €" en petit gris dessous. L'info actionnable (ce qu'il manque) est en premier, pas ce qui a été reçu.

### 4. Toutes les bordures de cards sont grises neutres
Pas de bordure rouge sur les cards avec retard. Pas de fond rose/rouge sur les cards en vue liste. Les status pills internes (`10j de retard` en rouge) font le travail d'alerte. L'interface reste premium et calme, même avec 5 retards. Toutes les cards : `border-neutral-200`.

### 5. Pas de "mur rouge" anxiogène
Si un proprio a 6 locataires en retard, la page ne doit pas devenir un écran rouge. Les cards restent blanches, neutres, élégantes. Seuls les petits badges colorés signalent les problèmes.

---

## ARCHITECTURE DE LA PAGE

```
┌────────────────────────────────────────────┐
│  ← Finances                                │
│  Suivi des loyers          [Par bien|Liste] │
│  ◀ Mars 2026 ▶  ● Mois en cours           │
├────────────────────────────────────────────┤
│  ENCAISSÉ                                  │
│  1 980 €                                   │
│  sur 3 389 €                               │
│  [3 payés] [1 partiel] [2 retards]         │
│  ━━━━━━━━━━━━━━━━━━━━░░░░░░░░░ (vert)     │
├────────────────────────────────────────────┤
│                                            │
│  VUE PAR BIEN (défaut) :                   │
│                                            │
│  ┌────────────────────────────────────┐    │
│  │ T4 Rivoli · Colocation             │    │
│  │ 10 Rue de Rivoli                   │    │
│  │ 750 / 1 350 €  ━━━━━░░░ (vert)    │    │
│  │ ─────────────────────────────────  │    │
│  │ Lucas M.    450 €   [10j retard]  │    │
│  │ Sarah K.    Reste 150 €  [Partiel]│    │
│  │ Youssef B.  450 €     [Payé]     │    │
│  └────────────────────────────────────┘    │
│                                            │
│  ┌────────────────────────────────────┐    │
│  │ Appartement Lumineux               │    │
│  │ 17 Rue Jules Guesde                │    │
│  │ ─────────────────────────────────  │    │
│  │ Michelle S.  809 €  [6j retard]   │    │
│  └────────────────────────────────────┘    │
│                                            │
│  ┌────────────────────────────────────┐    │
│  │ Studio Lyon                        │    │
│  │ Claire D.    580 €     [Payé]     │    │
│  └────────────────────────────────────┘    │
│                                            │
│  OU VUE LISTE :                            │
│  Triée par urgence (retards → partiels     │
│  → attente → payés). Cards plates,         │
│  chaque ligne = 1 locataire.               │
│                                            │
├────────────────────────────────────────────┤
│  CARD POWENS (dark, badge "Essentiel")     │
│  Connectez votre banque...                 │
│  [Passer à Essentiel — 7,90 €/mois]       │
└────────────────────────────────────────────┘
```

**Tap sur un locataire → Bottom Sheet avec :**
- Nom + bien + status pill
- Attendu / Reçu (2 cards côte à côte)
- Si partiel : card ambre "Reste dû : 150 €"
- Si retard : card rouge "X jours de retard · échéance le Y"
- Boutons d'action contextuels

---

## ORGANISATION EN TEAM AGENTS

### Agent 1 — Backend & Données

**Mission :** Créer la server action `getRentTracking.ts` qui retourne les loyers du mois groupés par bien, avec le statut de chaque locataire. Gérer la colocation (plusieurs locataires par bien).

**Fichiers à produire/modifier :**
- `app/actions/getRentTracking.ts` — **Nouveau ou refonte**
- `app/[locale]/finances/suivi-loyers/page.tsx` — **Nouveau** (ou refonte de la page existante)

### Agent 2 — Composants UI

**Mission :** Créer tous les composants. Design premium, mobile-first, bottom sheet pour les actions. S'inspirer strictement du prototype `suivi-loyers-v3.jsx`.

**Fichiers à produire :**
- `components/rent-tracking/RentTrackingHeader.tsx` — **Nouveau**
- `components/rent-tracking/MonthNav.tsx` — **Nouveau**
- `components/rent-tracking/RentSummaryCard.tsx` — **Nouveau**
- `components/rent-tracking/ViewToggle.tsx` — **Nouveau**
- `components/rent-tracking/PropertyGroup.tsx` — **Nouveau**
- `components/rent-tracking/TenantLine.tsx` — **Nouveau**
- `components/rent-tracking/StatusPill.tsx` — **Nouveau**
- `components/rent-tracking/FlatListView.tsx` — **Nouveau**
- `components/rent-tracking/RentDetailSheet.tsx` — **Nouveau** (bottom sheet)
- `components/rent-tracking/PowensUpsellCard.tsx` — **Nouveau**

### Agent 3 — Intégration & Polish

**Mission :** Assembler la page, brancher la navigation depuis /finances (quick link "Suivi des Loyers"), supprimer les anciens composants de "Mes locations", gérer les animations et le skeleton.

**Fichiers à modifier :**
- `app/[locale]/finances/suivi-loyers/loading.tsx` — Skeleton
- Navigation : lien depuis /finances
- Supprimer les anciens composants du suivi des loyers (le tableau avec accordéon)

---

## AGENT 1 — BACKEND

### Server action `getRentTracking.ts`

```typescript
interface RentTrackingParams {
  userId: string;
  month: number;  // 1-12
  year: number;
}

interface RentTrackingResult {
  // Résumé du mois
  summary: {
    totalExpected: number;
    totalReceived: number;
    paidCount: number;
    partialCount: number;
    overdueCount: number;
    pendingCount: number;
    totalCount: number;
  };

  // Groupé par bien
  properties: {
    id: string;
    name: string;
    address: string;
    isColocation: boolean;
    totalExpected: number;    // somme des loyers attendus de tous les locataires
    totalReceived: number;
    dueDay: number;           // jour d'échéance (1, 5, 10...)
    tenants: {
      id: string;
      name: string;           // pseudonyme Coridor
      expected: number;       // loyer attendu ce mois
      received: number;       // montant reçu
      remaining: number;      // expected - received (le reste dû)
      status: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE';
      daysLate: number | null;
      paidDate: string | null;
      rentTrackingId: string; // pour les actions (marquer payé, relancer)
    }[];
  }[];
}
```

**Logique :**

- Récupérer tous les baux actifs du proprio pour le mois donné
- Pour chaque bail, récupérer le `RentPaymentTracking` du mois
- **Colocation :** un bien peut avoir plusieurs baux actifs simultanément → grouper par `propertyId`
- **Statut :** utiliser le statut du `RentPaymentTracking` existant. Si pas de tracking pour ce mois (mois futur), ne pas inclure
- **dueDay :** extraire du bail (date d'échéance mensuelle, généralement le 1er ou le 5)
- Trier les biens par `dueDay` croissant
- Au sein de chaque bien, trier les locataires : OVERDUE → PARTIAL → PENDING → PAID

**Requêtes optimisées :** `Promise.all` pour paralléliser. Ne charger que le mois demandé.

---

## AGENT 2 — COMPOSANTS UI

### Design system (rappel)

- **Cards :** `bg-white rounded-2xl border border-neutral-200` (bordures visibles)
- **Shadow :** `shadow-sm` uniquement sur la card résumé en haut
- **Status pills :** seul vecteur de couleur dans les cards
  - OVERDUE : `bg-red-100 text-red-600` + "Xj de retard"
  - PARTIAL : `bg-amber-100 text-amber-600` + "Partiel"
  - PENDING : `bg-neutral-100 text-neutral-500` + "En attente"
  - PAID : `bg-emerald-50 text-emerald-600` + "Payé"
- **Fond page :** `bg-[#FAFAF9]`
- **Aucune bordure colorée** sur les cards. Aucun fond coloré.

### MonthNav.tsx

Navigation ◀ Mois Année ▶. Le mois en cours a un point vert + "Mois en cours". Quand on navigue vers un autre mois, ce label disparaît. Le mois est en `text-lg font-bold`. Les flèches sont des boutons `w-9 h-9 rounded-full hover:bg-neutral-100`.

### RentSummaryCard.tsx

Card résumé en haut. Structure :
- Gauche : "ENCAISSÉ" (label petit) + montant géant `text-[28px] font-extrabold` + "sur X €" en petit
- Droite : pills de décompte (`X payés` vert, `X partiel` ambre, `X retards` rouge). Les pills ne s'affichent que si le count > 0
- Barre de progression **toujours verte** (`bg-emerald-500`), jamais rouge

### ViewToggle.tsx

Toggle pill `[Par bien | Liste]`. Style segmented control : fond `bg-neutral-100 rounded-full p-0.5`, segment actif `bg-white shadow-sm rounded-full`. Position : en haut à droite du header, à côté du titre.

### PropertyGroup.tsx

Card groupant un bien et ses locataires :
- **Header :** nom du bien + badge "Colocation" (violet) si > 1 locataire + adresse en petit
- **Totaux :** "750 / 1 350 €" à droite du header, toujours en `text-neutral-900` (pas de couleur)
- **Barre de progression coloc :** si colocation, petite barre `h-1.5` verte sous le header
- **Locataires :** liste de `TenantLine`, séparées par `divide-y divide-neutral-50`
- **Bordure :** `border-neutral-200` toujours, pas de couleur conditionnelle

### TenantLine.tsx

Ligne cliquable dans un PropertyGroup :
- Nom du locataire à gauche
- À droite : montant + status pill + chevron
- **Si PAID :** montant en `text-emerald-600`
- **Si PARTIAL :** "Reste 150 €" en `text-amber-600` (montant principal) + "sur 450 €" en `text-neutral-400` (dessous)
- **Si OVERDUE :** montant en `text-neutral-900` (le montant dû n'est pas rouge, c'est la pill qui signale le retard)
- **Si PENDING :** montant en `text-neutral-900`
- `onClick` → ouvre le bottom sheet

### StatusPill.tsx

Pill compacte. Props : `status`, `daysLate?`.
- OVERDUE + daysLate : affiche "Xj de retard"
- OVERDUE sans daysLate : "En retard"
- PARTIAL : "Partiel"
- PENDING : "En attente"
- PAID : "Payé"

### FlatListView.tsx

Vue alternative (toggle "Liste"). Cards plates, une par locataire, triées par urgence (OVERDUE → PARTIAL → PENDING → PAID). Chaque card :
- Nom + nom du bien en petit dessous
- Montant + status pill + chevron à droite
- **Toutes les cards blanches** avec `border-neutral-200`. Pas de fond rouge.
- `onClick` → bottom sheet

### RentDetailSheet.tsx

Bottom sheet (slide up depuis le bas, overlay `bg-black/30 backdrop-blur-sm`, handle en haut) :
- **Header :** nom du locataire + bien en sous-titre + status pill
- **Montants :** 2 cards côte à côte "Attendu" / "Reçu"
- **Contexte conditionnel :**
  - PARTIAL → card ambre "Reste dû : X €"
  - OVERDUE → card rouge "X jours de retard · échéance le Y"
- **Actions contextuelles :**
  - OVERDUE/PARTIAL : "Envoyer un rappel" (bouton principal noir), "Marquer comme payé" (bouton vert), "Voir la conversation" (lien discret)
  - PAID : "Générer la quittance" (bouton principal noir), "Modifier le montant" (lien discret)
  - PENDING : "Marquer comme payé" (bouton principal noir), "Envoyer un avis d'échéance" (lien discret)

### PowensUpsellCard.tsx

Card dark pour l'upsell Powens. Affichée uniquement si le proprio n'a **pas** de connexion Powens active :
- Fond : `bg-gradient-to-br from-neutral-900 to-neutral-800`
- Titre : "Paiement des loyers" + badge "Essentiel" en ambre doré (`text-amber-400 bg-amber-400/15`)
- Description : "Connectez votre banque pour être alerté automatiquement"
- Sous-description : "Les paiements seront détectés et rapprochés sans intervention."
- CTA : "Passer à Essentiel — 7,90 €/mois" → lien vers la page d'abonnement

---

## AGENT 3 — INTÉGRATION

### Navigation

- La page vit à `/finances/suivi-loyers`
- Accessible depuis la page /finances via le quick link "Suivi des Loyers"
- Accessible depuis le dashboard via le KPI "Loyers" (mettre à jour le lien dans `MonthlyKPIs.tsx`)
- Breadcrumb "← Finances" en haut de la page
- Query params : `?month=3&year=2026` pour naviguer directement à un mois

### Suppression des anciens composants

Supprimer la page "Mes locations" et ses composants si elle n'est utilisée que pour le suivi des loyers. Si elle sert aussi à d'autres choses (gestion des baux), la garder mais retirer la section "Suivi des loyers" et la remplacer par un lien vers la nouvelle page.

### Skeleton loader

Mimer la structure : rectangle pour le header, card résumé, 3 cards property groups.

### Animations

- Sections en stagger fade-in (50ms, 100ms, 200ms, 300ms)
- Count-up sur le montant encaissé (800ms)
- Barre de progression : width 0% → X% en 700ms ease-out
- Bottom sheet : slide-up 300ms ease-out + overlay fade
- Changement de mois : tous les contenus refont un fade-in rapide (200ms)

---

## VÉRIFICATIONS

### Agent 1
- [ ] Loyers groupés par bien (`propertyId`)
- [ ] Colocation : plusieurs locataires dans le même bien
- [ ] Statuts corrects : PAID / PARTIAL / OVERDUE / PENDING
- [ ] `daysLate` calculé = aujourd'hui - date d'échéance (si > 0 et pas payé)
- [ ] `remaining` = expected - received (toujours ≥ 0)
- [ ] Trié par dueDay croissant, puis par urgence au sein de chaque bien
- [ ] Ne retourne que le mois demandé
- [ ] Promise.all pour paralléliser

### Agent 2
- [ ] Barre de progression TOUJOURS verte (jamais rouge)
- [ ] Décompte pills exhaustif : payés + partiels + retards (le total fait le bon compte)
- [ ] Partiel : "Reste X €" en principal, "sur Y €" en secondaire
- [ ] TOUTES les bordures de cards en `border-neutral-200` (pas de bordure colorée)
- [ ] AUCUN fond rouge/rose sur les cards (ni vue groupée ni vue liste)
- [ ] Status pills : seul vecteur de couleur dans les lignes
- [ ] Bottom sheet : actions contextuelles selon le statut
- [ ] Badge "Essentiel" ambre sur la card Powens
- [ ] CTA Powens : "Passer à Essentiel — 7,90 €/mois"
- [ ] Card Powens masquée si connexion Powens déjà active
- [ ] PropertyGroup : badge "Colocation" violet si > 1 locataire
- [ ] PropertyGroup : barre de progression coloc verte
- [ ] Montant total du bien toujours en `text-neutral-900` (pas de couleur)
- [ ] Mobile-first, pas de scroll horizontal

### Agent 3
- [ ] Page accessible depuis /finances et depuis le dashboard
- [ ] Query params `?month=&year=` fonctionnels
- [ ] Breadcrumb "← Finances" fonctionne
- [ ] Anciens composants suivi loyers supprimés ou découplés
- [ ] Skeleton loader cohérent
- [ ] Dark mode : tous les composants
- [ ] `npm run build` → 0 erreurs
