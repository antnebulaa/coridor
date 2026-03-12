# Refonte Page Dépenses & Charges par Bien

## Contexte

La page Dépenses & Charges est accessible via **Modification d'annonce → onglet Location → Dépenses & Charges**. C'est la vue opérationnelle des dépenses d'un bien individuel (vs `/finances` qui est la vue stratégique consolidée de tous les biens). Ce placement dans l'onglet Location est volontaire (pattern Airbnb).

Un prototype React interactif a été validé (fichier `depenses-charges-v3-complete.jsx` dans le projet). Il sert de **référence visuelle absolue**. En cas de doute sur un détail UI, se référer au prototype.

### Problèmes actuels à résoudre

1. **Perte de contexte** — le proprio ne sait pas dans quel bien il est quand il est dans l'onglet Location
2. **6 KPIs en ligne** — surcharge, pas de hiérarchie, impossible sur mobile
3. **Sélecteur d'années en pills** — ne scale pas (5+ années en horizontal)
4. **Bar chart Revenus/Dépenses inutile** — le loyer est constant, le graphique est plat et non informatif
5. **4 niveaux de filtres empilés** — 200px de hauteur avant le contenu
6. **Éléments ambigus** — cercle ○ sans signification, barre récup/non récup sans légende
7. **Aucune action sur les dépenses** — pas d'édition ni suppression inline
8. **Zéro pensée mobile** — tout overflow ou devient illisible
9. **Design incohérent** avec le dashboard refondé et /finances

### Décisions validées

- **1 card sombre avec 3 KPIs en ligne** (Cashflow / Revenus / Dépenses) — séparés par des dividers, même sur mobile
- **Le bar chart est supprimé** — remplacé par un widget "À venir" (prochaines dépenses récurrentes)
- **Filtres réduits à 2 rangées** — mois en pills + type en pills + catégorie en dropdown
- **4 résumés en ligne unique** avec dividers (Total / Récup / Non récup / Déductible)
- **Édition par tap** → bottom sheet pré-rempli (même formulaire que l'ajout)
- **Suppression** : swipe gauche mobile + hover icons desktop + confirmation dans le sheet
- **Toast undo** après suppression
- **Design system cuivre/ivoire Coridor** — palette copper #a8825e, copperBg #f3efe8, fond #f6f4f0, ink #18160f
- **Font DM Sans** — cohérent avec le reste de l'app

**Convention :** ce prompt utilise les team agents (sub-agents) pour l'exécution parallèle.

---

## ORGANISATION EN TEAM AGENTS

### Agent 1 — Header contextuel + KPIs + Sélecteur année

**Mission :** Ajouter le bandeau contextuel du bien dans TOUT l'onglet Location. Remplacer les 6 KPIs par 1 card sombre avec 3 métriques. Remplacer le sélecteur d'années pills par un sélecteur compact.

### Agent 2 — Widget "À venir" + Répartition + Filtres/Résumés

**Mission :** Créer le widget prévisionnel des dépenses à venir. Garder la répartition par catégorie (compactée). Simplifier les filtres. Créer la ligne de résumé unique.

### Agent 3 — Liste + Édition/Suppression + Bottom Sheet + Mobile

**Mission :** Refaire la liste des dépenses avec icônes, tags, swipe-to-delete, hover actions. Refondre le bottom sheet (ajout + édition unifiés). Toast undo. Responsive mobile-first sur tous les composants.

---

## AGENT 1 — HEADER CONTEXTUEL + KPIs + ANNÉE

### Bandeau contextuel du bien — PRIORITÉ #1

**Ce composant doit être ajouté dans le layout parent de TOUTES les sections de l'onglet Location** (pas seulement Dépenses — aussi Bail, Loyer, Visites, EDL, etc.). C'est UN composant partagé.

```
┌──────────────────────────────────────────────────────────┐
│  🏠  Appartement Lumineux                            ›   │
│      17 Rue Jules Guesde, Levallois                      │
└──────────────────────────────────────────────────────────┘
```

**Specs exactes :**
- Fond : bg-[#f3efe8] (copperBg) — border border-[#d4c4a8] (copperLight)
- Border radius : rounded-xl (12px)
- Padding : px-3 py-2
- Icône maison : 28×28px, rounded-[7px], fond copperLight, emoji 🏠 centré
- Titre bien : text-xs font-semibold couleur ink #18160f
- Adresse : text-[10px] couleur ink3 #6b6660
- Chevron droit : 12px, couleur ink4, cliquable → retour vers la fiche bien
- Margin bottom : mb-2.5
- **NON sticky** — scrolle avec le contenu
- Données : property.title + property.street + property.city — déjà disponibles dans le contexte /properties/[id]/edit/

**Fichier à identifier :**
```bash
# Trouver le layout parent de l'onglet Location
find app -path "*/properties/*/edit*" -name "*.tsx" | head -20
# Chercher le composant qui rend les sections Location (Bail, Loyer, etc.)
grep -rl "Mode de location\|Dépenses.*Charges\|Conditions du Bail" components/ app/ | head -15
```

### KPI Card — 1 card sombre, 3 colonnes

**Supprimer les 6 KPIs existants.** Les remplacer par une seule card :

```
┌──────────────────┬──────────────────┬──────────────────┐
│  CASHFLOW NET    │  REVENUS         │  DÉPENSES        │
│  +7 155 €        │  9 455 €         │  2 300 €         │
│  ↗ 3.4% vs 2024 │  Loyers+charges  │  Récup. Déd.     │
└──────────────────┴──────────────────┴──────────────────┘
```

**Specs exactes :**
- Fond : bg-[#18160f] (ink) — le noir Coridor
- Border radius : rounded-[14px]
- Layout : grid grid-cols-3 — TOUJOURS 3 colonnes, même sur mobile
- Dividers : border-r border-white/[0.08] entre les cellules
- Chaque cellule padding : p-3.5 md:p-4

**Cellule Cashflow Net :**
- Label : text-[9px] font-semibold text-white/40 uppercase tracking-wider
- Montant : text-2xl font-bold text-emerald-400 tabular-nums — préfixe "+" si positif
- "€" à côté : text-[11px] text-white/30
- Variation : text-[9px] text-emerald-400/70 font-medium — TOUJOURS inclure "vs {année-1}"
- Si cashflow négatif : montant en text-red-400, variation en text-red-400/70
- Animation : count-up de 0 à la valeur (500ms ease-out) via useCountUp

**Cellule Revenus :**
- Label : identique au cashflow
- Montant : text-xl font-bold text-white tabular-nums
- Sous-texte : text-[9px] text-white/35 → "Loyers + charges"

**Cellule Dépenses :**
- Label : identique
- Montant : text-xl font-bold text-amber-300 tabular-nums — ambre, pas blanc
- Sous-texte : 2 badges inline
  - "Récup. 190€" en text-[8px] text-emerald-300 font-semibold
  - "Déd. 1 460€" en text-[8px] text-violet-300 font-semibold

**Margin bottom : mb-2.5**

**Ce qui est SUPPRIMÉ (plus affiché ici, disponible dans /finances) :**
- Rendement Brut
- Rendement Net
- Manque à Gagner

### Sélecteur d'année compact

Remplacer les pills 2026 | 2025 | 2024 | 2023 | 2022 par :

```
  [ ◀ ]  2025  [ ▶ ]
```

- Flèches : w-7 h-7 rounded-full — zone de tap minimum pour mobile
- Année : text-[15px] font-bold tabular-nums — minWidth 36px, centré
- Flèche droite disabled si année courante ou future
- Positionné dans la même ligne que le titre "Dépenses & Charges"

### Lien vers /finances

Sous les KPIs (ou en bas de page), un lien discret :

```
Rendement & finances consolidées →
```

- text-[11px] text-[#9e9890] — hover → text-[#a8825e] (copper)
- Lien vers /finances?property={propertyId}&mode=year&year={year}

### Boutons actions (CSV, PDF, Régul.)

- Desktop : 3 petits boutons à droite du titre (text-[10px], border border-[#e8e4dc], rounded-[7px])
- Mobile : masqués, accessibles via un menu ⋯ dans le top bar (bottom sheet avec les 3 options)

---

## AGENT 2 — WIDGET "À VENIR" + RÉPARTITION + FILTRES

### Widget "À venir" — NOUVEAU

Remplace le bar chart supprimé. Affiche les prochaines dépenses récurrentes/prévisibles sur les 12 prochains mois.

```
┌──────────────────────────────────────────────────────────┐
│  À venir          ~1 659 €         12 prochains mois     │
│  ─────────────────────────────────────────────────────── │
│  💧 Eau Froide         Mensuel           32 € · 14 jan. │
│  ⚡ Élec. Communs      Mensuel           17 € · 14 jan. │
│  🔧 Ménage Hall        Mensuel           30 € · 14 jan. │
│  ──────────────────────────────────────────────────────  │
│                  Voir tout (5)  ▼                        │
└──────────────────────────────────────────────────────────┘
```

**Données :** générées à partir des dépenses récurrentes existantes (celles avec frequency: MONTHLY | QUARTERLY | ANNUAL). Pour chaque dépense récurrente, calculer la prochaine occurrence après aujourd'hui.

**Logique serveur :**
```typescript
// Pseudo-code pour générer les dépenses à venir
function getUpcomingExpenses(expenses: Expense[], fromDate: Date): UpcomingExpense[] {
  return expenses
    .filter(e => e.frequency !== 'PONCTUEL') // seulement les récurrentes
    .map(e => ({
      ...e,
      nextDate: calculateNextOccurrence(e.date, e.frequency, fromDate),
    }))
    .filter(e => e.nextDate <= addMonths(fromDate, 12)) // 12 mois max
    .sort((a, b) => a.nextDate - b.nextDate);
}
```

Si aucune dépense récurrente : ne pas afficher ce widget (pas d'état vide inutile).

**Specs UI :**
- Card blanche, rounded-[14px], border border-[#e8e4dc], p-3
- Header : "À venir" en text-xs font-semibold + badge total en bg-[#fef9ee] text-[#b45309] + "12 prochains mois" en text-[10px] text-[#9e9890]
- Chaque ligne : icône 28×28 → label + type → montant + date
- 3 items visibles par défaut, bouton "Voir tout (N)" dépliable en text-[11px] text-copper
- Dividers : border-t border-[#f0ede7]

### Répartition par catégorie — GARDER, compacter

Le widget existant (barre horizontale + légende) est bon. Le garder tel quel mais :
- Card blanche, même padding/radius que les autres
- Titre : "Répartition {année}" en text-xs font-semibold
- Barre : hauteur 6px, rounded
- Légende : chaque ligne text-[10px], point coloré 5×5, label + % + montant
- Hover : les segments non survolés passent à opacity-0.2
- Sur desktop large : afficher la légende en 2 colonnes si > 4 catégories

### Filtres simplifiés — 2 rangées max

**Rangée 1 — Mois :**
- Pills : [Tous] [Jan] [Fév] ... [Déc]
- Actif : bg-[#18160f] text-white rounded-full px-2.5 py-1 text-[11px] font-semibold
- Inactif : text-[#9e9890] px-2.5 py-1 text-[11px]
- Scroll horizontal sur mobile avec overflow-x-auto
- Séparateur border-b border-[#f0ede7] en dessous

**Rangée 2 — Type + Catégorie :**
- Pills type : Toutes / Récup. / Non récup. — mêmes styles que mois
- Dropdown catégorie : bouton avec icône filtre + "Catégorie" — s'ouvre en multi-select
  - Desktop : dropdown classique
  - Mobile : bottom sheet multi-select avec checkboxes

**SUPPRIMÉ :** la rangée sélecteur d'année (déplacé dans le header)

### Résumé 4 métriques — 1 seule ligne

Remplace les 4 cards séparées qui débordaient sur mobile :

```
┌────────────┬────────────┬────────────┬────────────┐
│   TOTAL    │  RÉCUP.    │ NON RÉCUP. │ DÉDUCTIBLE │
│  2 300€    │   188€     │  2 112€    │  1 830€    │
└────────────┴────────────┴────────────┴────────────┘
```

- display:flex avec flex:1 sur chaque cellule, border-r comme dividers
- rounded-[10px], border border-[#e8e4dc]
- Labels : text-[8px] font-bold uppercase tracking-wide avec couleur selon le type (ink/green/red/violet), opacity-65
- Montants : text-xs md:text-[13px] font-bold tabular-nums avec couleur selon le type
- Fonds colorés par cellule : blanc, greenBg, redBg, violetBg
- Texte centré dans chaque cellule, padding py-2 px-1

**SUPPRIMÉ :** la barre récup/non récup en dessous (redondante avec la ligne)

---

## AGENT 3 — LISTE + ÉDITION/SUPPRESSION + BOTTOM SHEET + MOBILE

### Liste des dépenses — Refonte complète

**Supprimer le cercle ○ ambigu.** Chaque dépense est une card compacte :

```
┌──────────────────────────────────────────────────────────┐
│  💧  Eau Froide 12/2025              32,04€              │
│      [Non récup.]                                        │
└──────────────────────────────────────────────────────────┘
```

- Icône catégorie : 30×30, rounded-lg, fond {couleur_cat}10
- Mapping catégorie → emoji :
  - Eau Froide/Chaude : 💧 / ♨️ (#0891b2)
  - Électricité : ⚡ (#ca8a04)
  - Chauffage : 🔥 (#dc2626)
  - Taxe Foncière : 🏛 (#7c3aed)
  - Assurance : 🛡 (#2563eb)
  - Entretien : 🔧 (#d97706)
  - Charges copro : 🏢 (#4f46e5)
- Label : text-xs font-medium ink
- Tag récupérabilité : pills text-[8px] font-semibold rounded-full px-1.5
  - Récup : bg-greenBg text-green
  - Déductible : bg-violetBg text-violet
  - Non récup : bg-[#f6f4f0] text-ink4
- Montant : text-xs font-semibold tabular-nums aligné à droite
- Hover (desktop) : fond copperBg, border copperLight
- Margin entre cards : 2px
- Groupement par mois quand filtre "Tous" : header text-[9px] font-bold text-ink4 uppercase tracking-widest

### Swipe-to-delete (mobile)

Chaque ligne est swipeable vers la gauche :
- Zone rouge derrière la card (76px de large, bg-red)
- Icône poubelle + texte "Suppr." en blanc
- Si le swipe dépasse 40px → la card se cale à -76px (révèle le bouton)
- Tap ailleurs → la card revient à 0
- Tap sur le bouton rouge → suppression avec toast undo

**Implémentation :** onTouchStart / onTouchMove / onTouchEnd avec translateX. Transition 0.2s ease sauf pendant le swipe.

### Hover actions (desktop)

Au hover sur une dépense, 2 boutons ronds apparaissent à droite :
- Bouton éditer : 26×26, rond, border, icône crayon 11px
- Bouton supprimer : 26×26, rond, border, icône poubelle 11px en rouge
- boxShadow: "0 1px 4px rgba(0,0,0,0.06)"

### Bottom Sheet unifié (Ajout + Édition)

**Un seul composant** qui gère les deux modes. Le mode est déterminé par la prop expense :
- expense === null → mode ajout (titre "Nouvelle dépense", bouton "Ajouter")
- expense !== null → mode édition (titre "Modifier la dépense", bouton "Enregistrer", pré-remplissage)

**3 étapes :**

**Étape 0 — Sélection du type :**
- Grille 2×2 de boutons avec emoji + label
- Tap → sélectionne le type, passe à l'étape 1
- En mode édition : skip cette étape (on arrive directement à l'étape 1), mais un lien "Modifier le type" en bas permet d'y revenir

**Étape 1 — Détails :**
- Badge type sélectionné en haut (emoji + label + bouton "Modifier")
- Champs : Libellé (input text), Montant en € (input number), Date (input date pré-remplie à aujourd'hui)
- Fréquence : pills Ponctuel | Mensuel | Trimestriel | Annuel
- Toggle Charge récupérable : switch avec label + sous-texte "Facturable au locataire"
- Boutons : "Retour" / "Continuer" (ou "Continuer" seul en mode édition + lien "Modifier le type")
- Bouton "Continuer" : bg-ink text-white quand valide, opacity-40 pointer-events-none quand invalide

**Étape 2 — Justificatif + Récapitulatif :**
- Zone upload photo (dropzone border-2 border-dashed)
- **Récapitulatif** encadré : emoji + label, montant, date, fréquence, récupérable
- Boutons : "Retour" / "Ajouter" ou "Enregistrer"
- **En mode édition uniquement :** lien rouge "Supprimer cette dépense" en bas
  - Premier tap → barre de confirmation bg-redBg avec "Confirmer ? [Supprimer] [Annuler]"
  - Confirmation → supprime + ferme le sheet

**Comportement mobile :**
- Slide up depuis le bas (animation: translateY(100%) → 0, 200ms ease-out)
- Handle en haut : barre grise 28×3px centrée
- Backdrop semi-transparent + blur
- max-height: 85vh, overflow-y: auto
- Le bien est **pré-sélectionné** (on est dans le contexte d'un bien) → pas de dropdown sélection de bien

**Comportement desktop :**
- Même bottom sheet centré (ou modale centrée, cohérent avec le formulaire existant)

### Toast Undo

Après chaque suppression :
- Toast en position: fixed, bottom: 80px, centré horizontal
- Fond ink, texte blanc, rounded-[10px], shadow
- "Dépense supprimée" + bouton "Annuler" en text-emerald-400
- Disparaît après 4 secondes
- Si "Annuler" → la dépense est restaurée dans la liste à sa position d'origine

### Responsive mobile — Vérifications

**Tous les composants doivent être testés sur 375px de large (iPhone SE).**

- KPI card 3 colonnes : les chiffres passent en text-lg si nécessaire, les labels restent text-[9px]
- Widget "À venir" : pleine largeur, pas de changement
- Répartition : légende en 1 colonne sur mobile (2 colonnes desktop)
- Filtres mois : scroll horizontal, gradient fade aux bords optionnel
- Résumé 4 cellules : les labels passent en text-[7px] si nécessaire, les montants en text-[11px]
- Liste dépenses : pleine largeur, swipe actif
- FAB : rond 52×52, position: fixed bottom-[18px] right-[14px], juste "+"
- Bottom sheet : pleine largeur, border-radius: 16px 16px 0 0

---

## FICHIERS À IDENTIFIER

**Étape préliminaire pour chaque agent :**

```bash
# Composants de la page Dépenses & Charges
find app components -name "*xpens*" -o -name "*harge*" -o -name "*epens*" | head -30

# Layout de l'onglet Location dans modification d'annonce
find app -path "*/properties/*/edit*" -name "*.tsx" | head -20

# KPIs existants de cette page
grep -rl "Cashflow Net\|Rendement Brut\|Revenus Encaissés\|Manque à Gagner" components/ app/ | head -20

# Sélecteur d'années
grep -rl "yearSelector\|YearSelector\|selectedYear" components/ app/ | head -15

# Composant graphique de trésorerie (à SUPPRIMER de cette page)
grep -rl "CashflowChart\|FluxTrésorerie\|cashflow.*chart" components/ app/ | head -10

# Formulaire ajout dépense existant
grep -rl "AddExpense\|QuickAdd\|ExpenseForm\|expense.*modal" components/ app/ | head -15
```

---

## VÉRIFICATIONS

### Agent 1 — Header & KPIs
- [ ] Bandeau contextuel du bien visible dans TOUTES les sections de l'onglet Location
- [ ] Le bandeau affiche titre + adresse correctement
- [ ] 1 seule card sombre avec 3 KPIs en ligne (plus 6 cards)
- [ ] Les 3 colonnes tiennent sur mobile 375px sans overflow
- [ ] Cashflow en vert/rouge selon signe, Dépenses en ambre
- [ ] Variation % inclut le contexte "vs {année-1}"
- [ ] Count-up animé sur les 3 montants
- [ ] Sélecteur année compact ◀ 2025 ▶ (plus de pills)
- [ ] Boutons CSV/PDF/Régul visibles desktop, dans menu ⋯ mobile
- [ ] Lien "Rendement & finances consolidées →" présent

### Agent 2 — Widget + Filtres
- [ ] Widget "À venir" affiche les prochaines dépenses récurrentes
- [ ] Widget masqué si aucune dépense récurrente
- [ ] Widget dépliable (3 items par défaut)
- [ ] Total prévisionnel affiché en badge ambre
- [ ] Répartition par catégorie compacte, hover dimme les autres
- [ ] Filtres : 2 rangées max (mois + type/catégorie)
- [ ] Catégories dans un dropdown multi-select (plus de pills scrollables)
- [ ] Résumé 4 cellules en 1 ligne (Total/Récup/Non récup/Déductible)
- [ ] Les montants s'adaptent à la largeur mobile
- [ ] **Le bar chart Revenus/Dépenses est SUPPRIMÉ de cette page**

### Agent 3 — Liste + Édition + Mobile
- [ ] Chaque dépense a une icône catégorie + tag récupérabilité
- [ ] Le cercle ○ ambigu est supprimé
- [ ] Tap sur une dépense → bottom sheet pré-rempli en mode édition
- [ ] Swipe gauche mobile → bouton supprimer rouge
- [ ] Hover desktop → icônes éditer/supprimer
- [ ] Bottom sheet unifié ajout/édition avec 3 étapes
- [ ] Mode édition : pré-rempli, titre "Modifier", bouton "Enregistrer"
- [ ] Mode édition : bouton "Supprimer" rouge avec confirmation
- [ ] Récapitulatif avant validation (étape 2)
- [ ] Toast undo 4 secondes après suppression, bouton "Annuler" fonctionnel
- [ ] Bien pré-sélectionné (pas de dropdown bien dans le formulaire)
- [ ] FAB rond 52px en bas à droite mobile
- [ ] Toutes les animations : slide-up sheet, count-up, hover transitions
- [ ] Dark mode : tous les composants modifiés
- [ ] Test mobile 375px : rien ne déborde
- [ ] npm run build → 0 erreurs
