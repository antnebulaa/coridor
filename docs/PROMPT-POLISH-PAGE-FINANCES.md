# Polish UX — Page Finances niveau Fintech

## Contexte

La page `/finances` est fonctionnelle : 3 KPIs, sélecteur de mois, toggle Mois/Année, 3 onglets (Revenus/Loyers/Dépenses), ajout rapide de dépense, filtre par bien, export PDF/CSV. Tout marche. Mais le design est encore générique — on veut le niveau Qonto, Mercury, Stripe Dashboard.

**Objectif :** polish visuel et interactions pour que la page soit aussi agréable à utiliser qu'un dashboard bancaire premium. Aucun changement fonctionnel — que du design, des animations, et du raffinement.

**Références visuelles :** Qonto (tableaux élégants, espacement généreux), Mercury (KPIs gros et clairs avec graphiques sparkline), Stripe Dashboard (couleurs fonctionnelles, transitions smooth), Revolut Business (cards avec gradients subtils).

---

## ORGANISATION EN TEAM AGENTS

### Agent 1 — KPIs & Header (haut de page)

**Mission :** Redesigner les 3 cards KPI pour qu'elles soient visuellement distinctes et hiérarchisées. Améliorer le header, le sélecteur de mois, le toggle, et la ligne de cashflow.

### Agent 2 — Onglets & Contenus (tableaux, listes, états vides)

**Mission :** Polish des 3 onglets : tableau Revenus (masquer les biens vacants inutiles), onglet Loyers (ajouter les boutons d'action), onglet Dépenses (état vide engageant, dropdown stylisé), transitions entre onglets.

### Agent 3 — Formulaires, Export & Micro-interactions

**Mission :** Polish du formulaire ajout dépense (bottom sheet mobile), boutons export, et toutes les micro-interactions (hover, transitions, animations de chargement).

---

## AGENT 1 — KPIs & HEADER

### Cards KPI — Redesign

Les 3 cards actuelles sont plates et identiques visuellement. Les différencier :

**Card Revenus — la carte principale :**

```
┌─────────────────────────────────────────┐
│                                         │
│  Revenus                                │
│                                         │
│  0 €                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░  │
│                                         │
│  sur 729 € attendus                     │
│                                         │
└─────────────────────────────────────────┘
```

- Le montant en `text-4xl font-bold tabular-nums` (plus gros que les autres)
- Barre de progression épaisse (h-2 au lieu de h-1) : `bg-emerald-500` pour la partie reçue, `bg-neutral-200` pour le reste. Si rien reçu : barre grise complète
- Sous-texte "sur X € attendus" en `text-sm text-neutral-400`
- Si 100% reçu : barre verte complète + petit ✅ animé à côté du montant
- Si en retard : barre avec segment rouge à droite + texte rouge sous la barre

**Card Loyers — focus statut :**

```
┌─────────────────────────────────────────┐
│                                         │
│  Loyers                                 │
│                                         │
│  0/1 reçus                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░  │
│                                         │
│  ⚠️ 1 en retard                         │
│                                         │
└─────────────────────────────────────────┘
```

- "0/1" en `text-3xl font-bold` avec "reçus" en `text-lg text-neutral-400` à côté
- Barre de progression épaisse (h-2) : segments verts (payés) + segments ambrés (en attente) + segments rouges (en retard)
- Texte statut sous la barre : "⚠️ 1 en retard" en `text-sm text-amber-600 font-medium` ou "✅ Tous reçus" en `text-sm text-emerald-600`
- Le texte statut est cliquable → scroll vers l'onglet Loyers

**Card Dépenses — avec CTA intégré :**

```
┌─────────────────────────────────────────┐
│                                         │
│  Dépenses                               │
│                                         │
│  0 €                                    │
│  ce mois                                │
│                                         │
│  [ + Ajouter ]                          │
│                                         │
└─────────────────────────────────────────┘
```

- Montant en `text-3xl font-bold`
- "ce mois" en `text-sm text-neutral-400`
- Bouton "+ Ajouter" : `rounded-full bg-neutral-900 text-white text-xs font-medium px-4 py-1.5 hover:bg-neutral-800` — petit, compact, visible
- Si des dépenses existent : afficher aussi "X dépenses" en `text-xs text-neutral-400` sous le montant

**Design commun des 3 cards :**
- `bg-white rounded-2xl border border-neutral-100 p-6` (pas p-5, plus aéré)
- Hover : `hover:shadow-md hover:border-neutral-200 transition-all duration-200` — signal que c'est cliquable
- `cursor-pointer` (chaque card est un lien vers l'onglet correspondant OU vers `/finances?tab=`)
- Espacement entre cards : `gap-4` (desktop grid-cols-3, mobile scroll snap)
- Animation au chargement : les montants font un count-up de 0 à la valeur (500ms ease-out) via `useCountUp`
- Barre de progression : animation de remplissage de gauche à droite (600ms ease-out, délai 200ms après le count-up)

### Ligne Cashflow — Plus de présence

Le cashflow "Cashflow net ce mois : 0 €" est trop discret. Le rendre plus impactant :

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Cashflow net        +729 €                             │
│  ce mois             Revenus - Dépenses                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- Card dédiée pleine largeur, pas juste une ligne de texte
- `bg-neutral-50 rounded-xl border border-neutral-100 px-6 py-4`
- Layout : label à gauche, montant à droite
- Montant positif : `text-2xl font-bold text-emerald-600`
- Montant négatif : `text-2xl font-bold text-red-600`
- Montant zéro : `text-2xl font-bold text-neutral-400`
- Sous-label "Revenus - Dépenses" en `text-xs text-neutral-400` sous le montant
- Pas de "Cashflow net ce mois :" en une phrase — séparer label et valeur

### Sélecteur de mois — Polish

Le sélecteur actuel est fonctionnel. Petits ajustements :

- Les flèches ◀ ▶ : `w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center transition-colors` — zone de tap plus grande
- "Mars 2026" en `text-xl font-bold` (un peu plus gros)
- "● Mois en cours" : le point vert `w-2 h-2 rounded-full bg-emerald-500 inline-block` suivi de "Mois en cours" en `text-xs text-emerald-600`
- Quand on navigue vers un autre mois : le badge change en lien "↩ Revenir au mois en cours" en `text-xs text-neutral-500 hover:text-neutral-700 cursor-pointer`

### Toggle Mois / Année — Polish

- `bg-neutral-100 rounded-full p-0.5 inline-flex` comme conteneur
- Segment actif : `bg-white rounded-full shadow-sm px-4 py-1.5 text-sm font-medium`
- Segment inactif : `px-4 py-1.5 text-sm text-neutral-500 hover:text-neutral-700`
- Transition du segment actif : slide horizontal smooth (200ms)

---

## AGENT 2 — ONGLETS & CONTENUS

### Onglets — Style

Les onglets actuels sont corrects (underline). Améliorer :

- Trait sous l'onglet actif : `h-0.5 bg-neutral-900 rounded-full` avec transition slide horizontale (200ms ease)
- Texte actif : `text-neutral-900 font-semibold`
- Texte inactif : `text-neutral-400 hover:text-neutral-600`
- Ajouter un compteur si pertinent : "Loyers" → "Loyers (1)" en badge `bg-red-100 text-red-600 text-xs rounded-full px-1.5 ml-1` si retards
- Espacement entre onglets : `gap-8` (plus aéré)
- Transition contenu : `opacity` fade 150ms quand on switch d'onglet (pas de jump brutal)

### Onglet Revenus — Tableau redesigné

**Problème actuel :** 6 lignes dont 5 "Vacant" qui noient la seule info utile.

**Solution :** séparer les biens actifs des biens vacants :

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Biens loués                                                 │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Appt Levallois · Michelle S.                         │  │
│  │  729 € attendus · 0 € reçu                           │  │
│  │                                    ⏳ En attente       │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ──────────────────────────────────────────────────────────  │
│                                                              │
│  Biens vacants (5)                              [ Déplier ] │
│                                                              │
│  ──────────────────────────────────────────────────────────  │
│                                                              │
│  Total attendu : 729 €   Total reçu : 0 €                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- Les biens loués en premier, chacun dans une card compacte
- Les biens vacants regroupés en une ligne dépliable "Biens vacants (5)" — au clic, la liste se déplie
- Pas de colonnes "—" partout — ça fait vide et déprimant
- Chaque ligne de bien loué : nom du bien, locataire, montant attendu vs reçu, statut en badge
- Ligne de total en bas : `font-semibold`, séparateur `border-t` au-dessus
- Hover sur chaque ligne : `bg-neutral-50 rounded-lg transition-colors` — cliquable vers le bien

**Desktop :** garder un tableau mais plus aéré, avec les lignes vacantes en section dépliable

**Mobile :** cards empilées (comme montré ci-dessus), pas de tableau horizontal

### Onglet Loyers — Ajouter les boutons d'action

L'onglet actuel montre bien les loyers en attente mais sans action possible. Ajouter :

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ⏳ En attente                                               │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │  Appt Levallois · Michelle S.                          │  │
│  │  809 € · Dû le 5 mars                                 │  │
│  │                                                        │  │
│  │  ┌──────────────────┐  ┌──────────────────────────┐   │  │
│  │  │ 💬 Envoyer un    │  │  Voir la conversation →  │   │  │
│  │  │    rappel        │  │                          │   │  │
│  │  └──────────────────┘  └──────────────────────────┘   │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ✅ Payés                                                    │
│                                                              │
│  (section dépliée/fermée selon s'il y a des items)           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- Bouton "Envoyer un rappel" : `rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-50` — action secondaire
- Bouton "Voir la conversation →" : `text-sm font-medium text-neutral-600 hover:text-neutral-900` — lien discret
- Si le loyer est en retard > 15 jours : la card passe en `bg-red-50 border-red-200` et le bouton rappel devient plus urgent ("Relancer")
- Section "✅ Payés" : affichée mais les items sont plus discrets (`text-neutral-400`), dépliable si plus de 3

**Catégories de statut avec couleurs :**
- 🔴 En retard (> 5 jours) : `bg-red-50 border-red-200`
- ⏳ En attente : `bg-amber-50 border-amber-200`
- ✅ Payés : `bg-white border-neutral-100` (discret)

### Onglet Dépenses — État vide et dropdown

**État vide redesigné :**

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  [ + Ajouter une dépense ]     [ Tous les biens  ▼ ]        │
│                                                              │
│                                                              │
│              📊                                              │
│                                                              │
│       Aucune dépense en mars 2026                            │
│                                                              │
│    Ajoutez vos dépenses pour suivre                          │
│    la rentabilité de vos biens.                              │
│                                                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- Icône graphique (Lucide `BarChart3` ou `Receipt`) en `text-neutral-300` au centre, taille 48px
- Texte principal : `text-neutral-500 font-medium`
- Texte secondaire : `text-neutral-400 text-sm`
- Pas juste "Aucune dépense ce mois" en texte gris perdu

**Dropdown filtre par bien :** le dropdown dark actuel détonne. Le remplacer par un dropdown light cohérent avec le design system :

- Bouton trigger : `rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 hover:border-neutral-300`
- Menu dropdown : `bg-white rounded-xl border border-neutral-200 shadow-lg py-1`
- Items : `px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50`
- Item actif : `bg-neutral-50 font-medium` avec checkmark ✓
- Animation : fade-in + scale de 95% à 100% (150ms)

**Quand il y a des dépenses :**

Chaque dépense dans une card compacte :

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  5 mars                                                  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  🔧 Entretien / Réparations                       │  │
│  │  Appt Levallois · Réparation fuite SdB            │  │
│  │                                                    │  │
│  │  -180 €                    Récupérable 100%        │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- Groupé par date (séparateur avec la date)
- Icône de catégorie à gauche (🔧 entretien, 🏠 assurance, ⚡ énergie, etc.)
- Montant aligné à gauche, tag "Récupérable" / "Déductible" à droite
- Tags : `bg-blue-50 text-blue-600 text-xs rounded-full px-2 py-0.5` (récupérable), `bg-emerald-50 text-emerald-600` (déductible)
- Card cliquable → ouvre l'édition de la dépense

**Ligne de total en bas :**
```
  Total : 920 €   Récupérable : 380 €   Déductible : 540 €
```
- `border-t border-neutral-100 pt-4 mt-4`
- Montants en `font-semibold`
- Labels en `text-sm text-neutral-500`

---

## AGENT 3 — FORMULAIRES, EXPORT & MICRO-INTERACTIONS

### Formulaire ajout dépense — Bottom sheet mobile

Sur mobile, le formulaire actuel (modale centrée) devrait être un bottom sheet :

- Slide up depuis le bas de l'écran (300ms ease-out)
- Backdrop semi-transparent
- Handle en haut (petite barre grise `w-10 h-1 rounded-full bg-neutral-300 mx-auto mb-4`)
- Draggable vers le bas pour fermer (gesture)
- Sur desktop : modale centrée, c'est ok tel quel

**Polish du formulaire :**

- Le bouton "Ajouter" actuellement gris → le rendre `bg-neutral-900 text-white` quand le formulaire est valide (montant > 0 + bien sélectionné + catégorie)
- Le bouton reste `bg-neutral-200 text-neutral-400 cursor-not-allowed` quand invalide
- Transition : `transition-colors duration-200`
- Après ajout réussi : haptic feedback (si Capacitor), toast "Dépense ajoutée ✓" en bas, le formulaire se ferme automatiquement avec un slide-down
- La nouvelle dépense apparaît en haut de la liste avec un flash ambre (highlight 1.5s puis fade)

### Boutons Export — Plus discrets

Les boutons "Exporter PDF" et "Exporter CSV" prennent trop de place visuelle pour une action secondaire.

**Option :** un seul bouton "Exporter" avec un dropdown :

```
  [ ↓ Exporter ▼ ]
  
  ┌─────────────────┐
  │  📄 Export PDF  │
  │  📊 Export CSV  │
  └─────────────────┘
```

- Bouton : `rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-600`
- Placé en haut à droite de la page (à côté du toggle Mois/Année) au lieu d'en bas
- Ou en bas dans un footer sticky discret sur mobile

### Micro-interactions globales

**Changement de mois :**
- Le contenu de la page fait un slide subtil : si on va vers le mois suivant → slide left (150ms), mois précédent → slide right
- Les montants refont le count-up à chaque changement de mois
- Les barres de progression se re-remplissent

**Changement d'onglet :**
- Fade crossover : l'ancien onglet fade out (100ms), le nouveau fade in (100ms)
- Le trait underline slide de l'ancien onglet vers le nouveau (200ms ease)

**Hover sur les lignes du tableau / cards :**
- `hover:bg-neutral-50 transition-colors duration-150 cursor-pointer rounded-lg`
- Sur mobile : pas de hover, juste le tap

**Loading states :**
- Quand on change de mois et que les données chargent : les cards KPI affichent un skeleton pulse sur les montants (pas un spinner global)
- Les tableaux affichent 3-4 lignes skeleton
- Transition : le skeleton se transforme en données avec un fade (200ms)

**Barre de progression Loyers :**
- Segmentée : chaque loyer = un segment de la barre
- Payé = segment vert, en attente = segment ambre, en retard = segment rouge
- Les segments apparaissent de gauche à droite avec un stagger de 100ms chacun

**Count-up des montants :**
- Utiliser le hook `useCountUp` existant
- Durée : 500ms ease-out
- Déclenchement : au mount initial + à chaque changement de mois
- Le cashflow fait un count-up aussi, en passant par les valeurs intermédiaires (0 → 729 en vert animé)

### Dark mode

Vérifier que tous les composants ont leurs variantes dark :

- Cards : `dark:bg-neutral-900 dark:border-neutral-800`
- Texte principal : `dark:text-neutral-100`
- Texte secondaire : `dark:text-neutral-400`
- Barres de progression fond : `dark:bg-neutral-800`
- Dropdown : `dark:bg-neutral-900 dark:border-neutral-700`
- Tags : adapter les fonds pour le dark (les `bg-blue-50` deviennent `dark:bg-blue-900/20`)

---

## FICHIERS À MODIFIER

| Fichier | Agent | Modification |
|---------|-------|-------------|
| `components/finances/MonthlyKPIs.tsx` (ou le composant KPI dans la page) | 1 | Redesign cards, barres épaisses, count-up, hover, liens |
| `components/finances/CashflowSummary.tsx` | 1 | Card dédiée au lieu de ligne de texte |
| `components/finances/MonthSelector.tsx` | 1 | Polish flèches, taille, badge mois courant |
| `components/finances/RevenueTab.tsx` | 2 | Séparer biens loués / vacants, section dépliable |
| `components/finances/RentTrackingTab.tsx` | 2 | Boutons action (rappel, conversation), couleurs par statut |
| `components/finances/ExpensesTab.tsx` | 2 | État vide redesigné, dropdown light, cards dépenses avec icônes catégorie |
| `components/finances/QuickAddExpense.tsx` | 3 | Bottom sheet mobile, bouton conditionnel, toast + haptic |
| `app/[locale]/finances/FinancesClient.tsx` | 3 | Transitions entre onglets, slide mois, bouton export déplacé |

---

## VÉRIFICATIONS

### Agent 1
- [ ] Card Revenus : montant text-4xl, barre épaisse colorée, count-up
- [ ] Card Loyers : ratio X/Y en gros, barre segmentée, texte statut cliquable
- [ ] Card Dépenses : bouton "+ Ajouter" visible, rond, noir
- [ ] 3 cards : hover shadow-md, cursor-pointer, animation au chargement
- [ ] Cashflow : card dédiée, montant gros, couleur conditionnelle (vert/rouge/gris)
- [ ] Sélecteur mois : flèches plus grosses, badge mois courant, lien retour si autre mois
- [ ] Toggle : pill segmented avec slide, segment actif en blanc avec shadow

### Agent 2
- [ ] Revenus : biens loués en premier, vacants en section dépliable
- [ ] Revenus : pas de lignes "— — Vacant" visibles par défaut
- [ ] Revenus : hover sur chaque ligne, cliquable
- [ ] Loyers : boutons "Envoyer un rappel" + "Voir la conversation" sur les retards
- [ ] Loyers : card rouge si > 15 jours de retard, ambre sinon
- [ ] Loyers : section "Payés" discrète et dépliable
- [ ] Dépenses état vide : icône + texte engageant centré
- [ ] Dépenses dropdown : light, cohérent avec le design system, animation fade+scale
- [ ] Dépenses cards : icône catégorie, montant, tags récupérable/déductible
- [ ] Dépenses total : ligne récap avec ventilation
- [ ] Fade transition entre onglets
- [ ] Underline slide entre onglets

### Agent 3
- [ ] Bottom sheet mobile pour ajout dépense (slide up, handle, draggable)
- [ ] Bouton "Ajouter" : gris quand invalide, noir quand valide, transition
- [ ] Toast + haptic après ajout, formulaire se ferme automatiquement
- [ ] Nouvelle dépense highlight ambre 1.5s dans la liste
- [ ] Export : un seul bouton avec dropdown (PDF / CSV)
- [ ] Slide horizontal au changement de mois
- [ ] Count-up refait à chaque changement de mois
- [ ] Skeleton pulse sur les KPIs pendant le chargement
- [ ] Dark mode : tous les composants
- [ ] npm run build → 0 erreurs
