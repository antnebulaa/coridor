# Refonte Page Dépenses & Charges par Bien

## ⚠️ ATTENTION — SCOPE STRICT

**Cette refonte concerne UNIQUEMENT la page Dépenses & Charges accessible via :**
`Modification d'annonce → onglet Location → Dépenses & Charges`

**NE PAS TOUCHER :**
- La page `/finances` (composants dans `components/finances/`, `app/[locale]/finances/`)
- Le dashboard (`components/dashboard/`)
- Les composants partagés utilisés par d'autres pages

**Avant de modifier un seul fichier, confirmer que le fichier fait partie de la page Dépenses & Charges par bien (dans le flow modification d'annonce), PAS de la page /finances consolidée.**

---

## Étape préliminaire OBLIGATOIRE — Identifier les fichiers

Avant tout travail, exécuter ces commandes et lister les fichiers trouvés :

```bash
# 1. Trouver la page Dépenses & Charges dans le flow modification d'annonce
find app components -path "*propert*" -name "*xpens*" -o -path "*propert*" -name "*harge*" -o -path "*propert*" -name "*Expense*" | grep -v finances | grep -v node_modules

# 2. Trouver le layout de l'onglet Location
find app -path "*/properties/*/edit*" -name "*.tsx" | grep -v node_modules

# 3. Trouver le composant ExpensesClient ou équivalent
grep -rl "ExpensesClient\|ExpensesList\|ExpensesSection" app/ components/ --include="*.tsx" | grep -v finances | grep -v node_modules

# 4. Trouver le formulaire d'ajout de dépense existant
grep -rl "AddExpense\|ExpenseForm\|expense.*modal\|Type de dépense" app/ components/ --include="*.tsx" | grep -v finances | grep -v node_modules

# 5. Trouver les KPIs/graphiques actuels de cette page (ceux à supprimer)
grep -rl "Cashflow Net\|Rendement Brut\|Revenus Encaissés\|Manque à Gagner\|CashflowChart" components/ --include="*.tsx" | grep -v finances | grep -v dashboard | grep -v node_modules

# 6. Trouver le sélecteur d'années existant
grep -rl "yearSelector\|YearSelector\|selectedYear\|2022.*2023.*2024" components/ --include="*.tsx" | grep -v finances | grep -v node_modules
```

**Ne commencer le travail qu'après avoir identifié les fichiers exacts.**

---

## Contexte

C'est la page de **gestion opérationnelle des dépenses d'un bien spécifique**. Le proprio arrive ici pour ajouter, consulter, éditer et supprimer les dépenses de ce bien.

### Checklist UX appliquée

1. **Job de cette page :** "Le proprio gère les dépenses et charges d'un bien"
2. **Donnée principale :** Total des dépenses + ventilation récup/non récup/déductible
3. **Pertinence :** PAS de revenus, PAS de cashflow, PAS de rendement — tout ça est sur /finances
4. **Redondance :** Revenus, cashflow, rendement sont sur /finances et le dashboard → ne PAS les afficher ici
5. **Mobile above the fold :** Bandeau bien + total dépenses + début du widget "À venir" ou de la liste
6. **Actions :** Ajouter, éditer, supprimer une dépense
7. **Forward-looking :** Widget "À venir" (prochaines dépenses récurrentes)

---

## État actuel — Ce qui est déjà en place

**GARDER tel quel (ne pas modifier) :**
- ✅ Lignes de dépenses plates (sans cards/border-radius), pleine largeur, séparateur fin
- ✅ Icônes catégorie colorées (💧 eau, ⚡ élec, 🔧 entretien)
- ✅ Tailles de texte `sm`
- ✅ Groupement par mois (DÉCEMBRE 2025, NOVEMBRE 2025)
- ✅ Filtres mois en pills (Tous, Jan, Fév...)
- ✅ Filtres type (Toutes, Récup., Non récup.) + dropdown Catégorie
- ✅ Résumé 4 cellules en ligne (Total / Récup / Non récup / Déductible)
- ✅ Répartition par catégorie (barre horizontale + légende)
- ✅ FAB "+" rond en bas à droite
- ✅ Formulaire d'ajout en 3 étapes (Type → Détails → Justificatif)
- ✅ Tags "Régularisé" sur les dépenses

**AJOUTER :**
- 🆕 Bandeau contextuel du bien (nom + adresse) — dans TOUT l'onglet Location
- 🆕 Widget "À venir" — prochaines dépenses récurrentes
- 🆕 Édition au tap → bottom sheet pré-rempli
- 🆕 Suppression : swipe gauche mobile + hover icons desktop
- 🆕 Toast undo après suppression
- 🆕 Sélecteur d'année compact ◀ 2025 ▶

**SUPPRIMER :**
- ❌ Les 6 KPIs annuels (Cashflow, Revenus, Manque à Gagner, Rendement Brut, Rendement Net, Dépenses Totales)
- ❌ Le graphique barres "Flux de Trésorerie Mensuel"
- ❌ Le sélecteur d'années en pills horizontales
- ❌ La date redondante "12/2025" affichée en gris à côté de chaque dépense (le header de groupe donne déjà le mois)

**Convention :** ce prompt utilise les team agents (sub-agents) pour l'exécution parallèle.

---

## ORGANISATION EN TEAM AGENTS

### Agent 1 — Bandeau bien + Sélecteur année + Nettoyage

**Mission :** Ajouter le bandeau contextuel. Sélecteur année compact. Supprimer les 6 KPIs et le graphique.

### Agent 2 — Widget "À venir" (nouveau)

**Mission :** Créer le widget prévisionnel des dépenses récurrentes. Backend + Frontend.

### Agent 3 — Édition/Suppression + Bottom Sheet + Mobile

**Mission :** Tap pour éditer, swipe-to-delete, hover icons, toast undo, nettoyage date redondante.

---

## AGENT 1 — BANDEAU BIEN + SÉLECTEUR ANNÉE + NETTOYAGE

### Bandeau contextuel du bien

**Ajouté dans le layout parent de TOUTES les sections de l'onglet Location** (Bail, Loyer, Visites, EDL, Dépôt, Dépenses, Critères). Composant partagé, pas dupliqué.

```
┌──────────────────────────────────────────────────────────┐
│  🏠  Appartement Lumineux                            ›   │
│      17 Rue Jules Guesde, Levallois                      │
└──────────────────────────────────────────────────────────┘
```

- Fond : `bg-[#f3efe8]` — `border border-[#d4c4a8]`
- `rounded-xl`, `px-3 py-2`, `mb-3`
- Icône : 28×28, `rounded-[7px]`, fond `#d4c4a8`
- Titre : `text-sm font-semibold` couleur `#18160f`
- Adresse : `text-xs` couleur `#6b6660`
- Chevron droit → retour fiche bien
- NON sticky

### Sélecteur d'année compact

**Supprimer** les pills `2026 | 2025 | 2024 | 2023 | 2022`.

**Remplacer :** `[ ◀ ]  2025  [ ▶ ]`
- Flèches `w-8 h-8 rounded-full hover:bg-neutral-100`
- Année `text-base font-bold tabular-nums`
- Même ligne que "Dépenses & Charges"
- Droite disabled si année courante

### Suppression KPIs et graphique

**SUPPRIMER de cette page :**
1. Les 6 cards KPIs annuels
2. Le graphique "Flux de Trésorerie Mensuel"

**⚠️ Ne pas supprimer les composants si d'autres pages les utilisent. Juste ne plus les importer ici.**

**GARDER :**
- Le résumé 4 cellules en ligne — c'est le KPI principal maintenant
- Le bouton "Régul. Annuelle"
- La répartition par catégorie (barre + légende)

### Layout résultant

```
┌──────────────────────────────────────────────────────────┐
│  🏠  Appartement Lumineux · Levallois                ›   │
├──────────────────────────────────────────────────────────┤
│  Dépenses & Charges          [ ◀ 2025 ▶ ]  [CSV] [PDF] │
├──────────────────────────────────────────────────────────┤
│  [Widget "À venir" — Agent 2]                            │
├──────────────────────────────────────────────────────────┤
│  [Répartition par catégorie]                             │
├──────────────────────────────────────────────────────────┤
│  [Filtres + Résumé 4 cellules]                           │
├──────────────────────────────────────────────────────────┤
│  [Liste des dépenses]                                    │
└──────────────────────────────────────────────────────────┘
```

---

## AGENT 2 — WIDGET "À VENIR"

### Backend

Générer les prochaines dépenses à partir des dépenses récurrentes (frequency ≠ PONCTUEL) :

```typescript
function getUpcomingExpenses(propertyId: string, fromDate: Date): UpcomingExpense[] {
  // 1. Récupérer les dépenses récurrentes du bien
  // 2. Calculer la prochaine occurrence :
  //    MONTHLY → même jour du mois prochain
  //    QUARTERLY → +3 mois
  //    ANNUAL → même mois/jour l'année prochaine
  // 3. Filtrer sur 12 mois
  // 4. Trier par date ASC
  // 5. Dédupliquer (1 entrée par type de dépense récurrente)
}
```

### Frontend

```
┌──────────────────────────────────────────────────────────┐
│  À venir        ~1 659 €            12 prochains mois    │
│  ─────────────────────────────────────────────────────── │
│  💧 Eau Froide         Mensuel            32 € · 14 jan │
│  ⚡ Élec. Communs      Mensuel            17 € · 14 jan │
│  🔧 Ménage Hall        Mensuel            30 € · 14 jan │
│                    Voir tout (5)  ▼                      │
└──────────────────────────────────────────────────────────┘
```

- Card blanche, `rounded-xl`, `border`, `p-3`
- Badge total : `bg-amber-50 text-amber-700 text-sm font-semibold rounded-full px-2`
- Lignes : icône 28×28, label `text-sm font-medium`, fréquence `text-xs text-neutral-500`, montant `text-sm font-semibold tabular-nums`
- 3 items par défaut, "Voir tout" dépliable
- **Si aucune dépense récurrente → ne pas afficher le widget**

---

## AGENT 3 — ÉDITION/SUPPRESSION + BOTTOM SHEET + MOBILE

### Tap pour éditer

Au tap/clic sur une dépense → ouvre le bottom sheet existant (formulaire 3 étapes) en mode édition :

- **Pré-rempli** avec type, libellé, montant, date, fréquence, récupérable
- Titre : "Modifier la dépense"
- Skip l'étape 0 (type) — arrive directement à l'étape 1
- Lien "Modifier le type" en bas pour revenir à l'étape 0
- Bouton final : "Enregistrer" au lieu de "Ajouter"

**Étape 2 — ajouter un récapitulatif :**
```
┌──────────────────────────────────────────────────────┐
│  RÉCAPITULATIF                                       │
│  💧 Eau Froide                            32,04 €   │
│  14/12/2025 · Mensuel · Non récupérable              │
└──────────────────────────────────────────────────────┘
```

### Suppression — depuis le bottom sheet

En bas de l'étape 2 en mode édition :
- Lien rouge "Supprimer cette dépense"
- Tap → barre de confirmation `bg-red-50` : "Confirmer ? [Supprimer] [Annuler]"
- Supprimer → ferme le sheet + toast undo

### Swipe-to-delete (mobile)

- Zone rouge 76px derrière chaque ligne, icône poubelle + "Suppr."
- Swipe > 40px → cale à -76px
- Tap bouton → suppression + toast
- Tap ailleurs → retour à 0
- `onTouchStart/Move/End` + `translateX`, transition 0.2s

### Hover actions (desktop)

Au hover sur une ligne :
- 2 boutons ronds 28×28 à droite
- Crayon (éditer) : border neutral-200, fond blanc
- Poubelle (supprimer) : border neutral-200, icône rouge
- Click crayon → ouvre le bottom sheet en mode édition
- Click poubelle → suppression directe + toast undo

### Toast undo

- Position fixed, bottom 80px, centré
- Fond sombre, texte blanc, `rounded-xl`
- "Dépense supprimée" + bouton "Annuler" en vert
- Disparaît après 4 secondes
- Annuler → restaure la dépense

### Nettoyage date redondante

Supprimer la date "12/2025" affichée en gris à côté de chaque label de dépense. Le header de groupe "DÉCEMBRE 2025" donne déjà cette info. Ne pas modifier le libellé de la dépense lui-même s'il contient la date.

---

## VÉRIFICATIONS

### Agent 1
- [ ] Bandeau bien visible dans TOUTES les sections de l'onglet Location
- [ ] Sélecteur d'années compact (plus de pills)
- [ ] 6 KPIs SUPPRIMÉS
- [ ] Graphique trésorerie SUPPRIMÉ
- [ ] Résumé 4 cellules CONSERVÉ
- [ ] Répartition catégorie CONSERVÉE
- [ ] **AUCUN fichier dans `components/finances/` ou `app/[locale]/finances/` modifié**

### Agent 2
- [ ] Widget "À venir" affiche les prochaines dépenses récurrentes
- [ ] Backend calcule les prochaines occurrences
- [ ] Widget masqué si pas de dépense récurrente
- [ ] 3 items par défaut, dépliable
- [ ] **AUCUN fichier dans `components/finances/` ou `app/[locale]/finances/` modifié**

### Agent 3
- [ ] Tap → bottom sheet pré-rempli mode édition
- [ ] Titre "Modifier", bouton "Enregistrer"
- [ ] Récapitulatif avant validation
- [ ] Suppression avec confirmation dans le sheet
- [ ] Swipe gauche mobile → bouton supprimer
- [ ] Hover desktop → icônes éditer/supprimer
- [ ] Toast undo fonctionnel
- [ ] Date redondante nettoyée
- [ ] **AUCUN fichier dans `components/finances/` ou `app/[locale]/finances/` modifié**

### Global
- [ ] `npm run build` → 0 erreurs
- [ ] Page `/finances` fonctionne exactement comme avant
- [ ] Dashboard fonctionne exactement comme avant
- [ ] Mobile 375px : rien ne déborde
