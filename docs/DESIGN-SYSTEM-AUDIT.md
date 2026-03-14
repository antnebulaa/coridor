# Audit Design System — Coridor

> Date : 14 mars 2026
> Scope : `app/` + `components/` (hors node_modules, .next, docs/, messages/)
> 445 fichiers .tsx analysés

---

## Score global

| Dimension | Score | Statut |
|-----------|-------|--------|
| Typographie | 9/10 | Excellent |
| Couleurs | 5/10 | Inconsistant |
| Cards & Containers | 7/10 | Bon, shadows a corriger |
| Boutons | 5/10 | Fragment |
| Composants reutilisables | 4/10 | Fragmente |
| Formulaires | 9/10 | Excellent |
| Espacement | 6/10 | Pas de convention stricte |
| Dark mode | 3/10 | 37.5% couverture |
| Responsive / Mobile-first | 8/10 | Bon, touch targets critiques |
| Inconsistances | 5/10 | Couleurs + strings hardcodes |

---

## 1. Typographie

### 1.1 Font weights

| Classe | Occurrences | Fichiers |
|--------|-------------|----------|
| `font-normal` | 1 384 | 230 |
| `font-medium` | 1 303 | 251 |
| `font-semibold` | 678 | 198 |
| `font-light` | 602 | 154 |
| `font-bold` | 340 | 132 |
| `font-thin` | 0 | 0 |
| `font-extralight` | 0 | 0 |
| `font-extrabold` | 0 | 0 |
| `font-black` | 0 | 0 |

5 weights actifs sur 9. Les extremes (thin, extralight, extrabold, black) ne sont jamais utilises.

### 1.2 Tailles de titres

| Classe | Occurrences | Fichiers | Usage |
|--------|-------------|----------|-------|
| `text-4xl` | 60 | 39 | Heroes, titres de page |
| `text-3xl` | 116 | 68 | Sections majeures |
| `text-2xl` | 201 | 109 | Sous-headers |
| `text-xl` | 168 | 69 | Titres de cards |
| `text-lg` | 1 384 | 230 | Taille primaire |
| `text-base` | 1 303 | 251 | Corps de texte |
| `text-sm` | 602 | 154 | Labels, texte secondaire |
| `text-xs` | **0** | **0** | **CONFORME** |

**text-xs = 0 occurrence.** Regle respectee a 100%.

Hierarchie de titres : H1 alterne entre `text-3xl` et `text-4xl`. H2 cluster autour de `text-2xl`. H3 utilise `text-lg`/`text-xl`. Pas de standard strict.

### 1.3 Letter-spacing

| Classe | Occurrences | Fichiers |
|--------|-------------|----------|
| `tracking-tight` | 114 | 65 |
| `tracking-wide` | 25 | 20 |
| `tracking-wider` | 49 | 30 |
| `tracking-normal` | 0 | 0 |
| `tracking-widest` | 0 | 0 |

Usage minimal (188 occurrences / 85 fichiers, ~12% du codebase).

### 1.4 Fonts custom

| Pattern | Occurrences | Notes |
|---------|-------------|-------|
| `font-matter` | 1 | CSS variable seulement (globals.css) |
| `font-boldonse` | 0 | **Declare mais jamais utilise** |
| `font-serif` | 0 | Non utilise |
| `--font-serif-sim` | 6 | Scope simulateur uniquement |

**Boldonse** est enregistre dans globals.css (lignes 4-10) mais jamais utilise comme classe nulle part.

---

## 2. Couleurs

### 2.1 Backgrounds

| Classe | Occurrences | Fichiers |
|--------|-------------|----------|
| `bg-white` | 481 | 179 |
| `bg-neutral-*` (total) | 666+ | 200+ |
| `bg-gray-50` | 15 | 10 |
| `bg-gray-100` | 22 | 12 |
| `bg-black` | inclus ci-dessus | — |

**PROBLEME : gray et neutral sont melanges.** 37 instances de `bg-gray-*` coexistent avec des centaines de `bg-neutral-*`.

Fichiers avec `bg-gray-*` (a migrer vers neutral) :
- `inbox/[conversationId]/components/MessageBox.tsx` (5)
- `deposit/[applicationId]/page.tsx` (4)
- `inspection/[inspectionId]/rooms/page.tsx` (6)
- `inspection/[inspectionId]/deposit-response/page.tsx` (2)
- `inspection/[inspectionId]/sign/page.tsx` (2)
- `inspection/new/[applicationId]/InspectionHomeClient.tsx` (2)
- `account/reminders/RemindersClient.tsx` (2)
- `components/messaging/DocumentsPanel.tsx` (6)
- `components/messaging/DocumentBanner.tsx` (2)
- `components/deposit/DepositAlertWidget.tsx` (1)
- `components/visits/VisitSlotSelector.tsx` (2)
- `components/inspection/AudioRecorder.tsx` (1)
- `components/inspection/ConditionChips.tsx` (1)

### 2.2 Texte primaire

| Classe | Occurrences |
|--------|-------------|
| `text-neutral-900/800/700` | ~895 |
| `text-gray-900` | ~13 |
| `text-gray-800` | ~5 |
| `text-black` | frequent |

**PROBLEME :** Mix de `text-neutral-900`, `text-black`, et `text-gray-900`.

Fichiers avec `text-gray-9xx` :
- `deposit/[applicationId]/page.tsx` (7 instances)
- `inbox/[conversationId]/components/MessageBox.tsx` (5)
- `components/messaging/DocumentsPanel.tsx` (6)
- `components/messaging/DocumentBanner.tsx` (2)

### 2.3 Texte secondaire

| Classe | Occurrences |
|--------|-------------|
| `text-neutral-500/400/600` | ~1 252 |
| `text-gray-500/400/600` | ~20 |

95% consistant avec neutral. ~20 instances `text-gray-*` residuelles dans 4 fichiers (deposit, reminders, DocumentsPanel, TenantProfilePreview).

### 2.4 Couleurs hex hardcodees

**100+ valeurs hex hardcodees** dans JSX/TSX.

| Hex | Usage | Fichiers |
|-----|-------|----------|
| `#1719FF` | Bleu custom (home, categories) | 4 |
| `#FE3C10` | Orange/rouge accent | 2 |
| `#D4703D`, `#B9592D`, `#9A4724` | Palette ambre simulateur | 12+ |
| `#E8A838` | Or (passport, move-in) | 5+ |
| `#1A1A1A`, `#2D2D2D`, `#333`, `#404040` | Gris dark theme | 18+ |
| `#F5F5F5`, `#EBEBEB`, `#dfdfdf` | Gris clairs | 15+ |
| `#D82800`, `#750077` | Gradients SVG (LikeButton) | 2 |
| `#111827` | Canvas signature | 2 |

Theme simulateur : 30+ custom properties CSS dans globals.css (`--sim-*`).

### 2.5 Couleurs fonctionnelles

**Palette design system (correctement utilisee) :**
- `red-*` : 70+ fichiers
- `emerald-*` : 70+ fichiers
- `amber-*` : 70+ fichiers
- `blue-*` : 66+ fichiers

**PROBLEME MAJEUR : couleurs invalides utilisees au lieu du design system :**

| Invalide | Occurrences | Devrait etre | Fichiers |
|----------|-------------|--------------|----------|
| `bg-green-*` / `text-green-*` | **175+** | `emerald-*` | 50+ fichiers |
| `bg-yellow-*` | ~30 | `amber-*` | 10+ fichiers |
| `bg-orange-*` | ~20 | `amber-*` | 5+ fichiers |

**Top fichiers avec `green-*` au lieu de `emerald-*` :**
- `RentalsClient.tsx`, `deposit/page.tsx`, `VisitsClient.tsx`, `ConversationBox.tsx`
- `MessageBox.tsx`, `ConversationClient.tsx`, admin/* (10+ fichiers)
- `inspection/*` (5+ fichiers), `dashboard/*` (5+ fichiers)
- `PropertyStandardCard.tsx`, `PropertyColocationCard.tsx`, `PropertiesListRow.tsx`
- `PriceSection.tsx`, `VisitsSection.tsx`, `DepositSection.tsx`, `LegalInfoSection.tsx`
- `FurnitureSection.tsx`, `EnergyDiagnosticsSection.tsx`, `SelectionClient.tsx`
- `TenantProfileClient.tsx`, `RentModal.tsx` (7), `ListingEnergy.tsx`
- `LegalRemindersWidget.tsx`, `RentTrackingSection.tsx`, `VisitSlotSelector.tsx`
- `RentEstimator.tsx`, `FreelanceIncomeCard.tsx`, `LandlordReviewForm.tsx`
- `PassportPreview.tsx`, `TenantProfilePreview.tsx`

---

## 3. Cards & Containers

### 3.1 Border-radius

| Classe | Occurrences | Standard |
|--------|-------------|----------|
| `rounded-2xl` | ~95 | PRIMARY — cards principales |
| `rounded-xl` | ~145 | SECONDARY — containers imbriques |
| `rounded-full` | ~737 | Pills, icones, boutons ronds |
| `rounded-lg` | ~25 | Rare |
| `rounded-[12px]` | ~10 | Legacy (SoftButton) |
| `rounded-3xl` | 0 | Non utilise |
| `rounded-md` | ~8 | Rare |

Standard : `rounded-2xl` pour les cards principales, `rounded-xl` pour les secondaires.

### 3.2 Bordures de cards

| Classe | Occurrences | Standard |
|--------|-------------|----------|
| `border-neutral-200` | ~180 | PRIMARY |
| `border-neutral-100` | ~95 | Subtil |
| `border-neutral-300` | ~55 | Emphase |
| **border-neutral-* total** | **~330** | **Prefere** |
| `border-gray-200` | ~70 | Legacy |
| `border-gray-100` | ~40 | Legacy |
| `border-gray-300` | ~15 | Legacy |
| **border-gray-* total** | **~125** | **A migrer** |
| `border-slate-200` | ~85 | Admin seulement |

**PROBLEME :** 125 instances de `border-gray-*` et 85 de `border-slate-*` coexistent avec le standard `border-neutral-*`.

### 3.3 Shadows

| Classe | Occurrences |
|--------|-------------|
| `shadow-sm` | ~85 |
| `shadow-md` | ~25 |
| `shadow-lg` | ~15 |
| `shadow-xl` | ~5 |
| **Total** | **~132** |

**CRITIQUE :** 132 shadows alors que la regle est d'utiliser des bordures.

Principaux fichiers avec `shadow-sm` :
- Admin : StatsCard, AdminListingDetailClient, ListingModerationTable, PlanDistribution, GeoDistribution, SubscriptionMetrics, ConversionFunnel, RentalMetrics, EngagementMetrics, PollManagementClient
- MessageBox (badges)

### 3.4 Padding de cards

| Classe | Occurrences | Usage |
|--------|-------------|-------|
| `p-6` | ~120 | Cards principales |
| `p-5` | ~45 | Dashboard widgets |
| `p-4` | ~85 | Cards compactes, alertes |
| `p-3` | ~35 | Petit contenu imbrique |
| `p-8` | ~10 | Extra spacieux |

Hierarchie coherente : `p-6` > `p-5` > `p-4`.

---

## 4. Boutons

### 4.1 Usage du composant Button

- **Button.tsx importe dans** : 37 fichiers
- **Boutons raw `<button>`** : nombreux (non comptabilises mais significatif)

### 4.2 Variantes de boutons (fragmentation)

**8 composants bouton dans `components/ui/` :**

| Composant | Imports | Statut |
|-----------|---------|--------|
| `Button.tsx` | 37 | CORE |
| `LargeActionButton.tsx` | 6 | Sous-utilise |
| `DarkActionButtonFlex.tsx` | 6 | Sous-utilise |
| `CircleButton.tsx` | 3 | Sous-utilise |
| `PillButton.tsx` | 2 | Minimal |
| `DarkActionButton.tsx` | 2 | Minimal |
| `SoftButton.tsx` | 1 | Minimal |
| `FloatingValuesButton.tsx` | 0 | **INUTILISE** |

+ 4 boutons specialises hors ui/ : `HeartButton`, `LikeButton`, `ReportButton`, `DocumentsButton`

**A consolider** en variantes du composant Button principal.

### 4.3 Styles de bouton primaire

- `variant='primary'` (via Button.tsx, utilise `bg-primary`) : ~70 usages
- `bg-black text-white` hardcode : 11 instances (legacy)
- `bg-neutral-900 text-white` : ~8 instances

### 4.4 Border-radius des boutons

| Classe | Occurrences |
|--------|-------------|
| `rounded-2xl` | ~72 (Button component) |
| `rounded-full` | ~180 (pills, icones) |
| `rounded-[12px]` | ~25 (SoftButton legacy) |
| `rounded-xl` | ~40 (secondaire) |

### 4.5 Padding des boutons

- Button.tsx : `h-[50px] px-4` (standard)
- SoftButton : `px-[18px] py-[13px]` (legacy custom)
- PillButton : `h-12 px-6`
- Deposit/Inspection pages : `py-3 rounded-xl` (custom)

---

## 5. Composants reutilisables

### 5.1 Inventaire `components/ui/`

**13 composants :**

| Composant | Imports | Statut |
|-----------|---------|--------|
| Button.tsx | 37 | CORE |
| Skeleton.tsx | 9 | CORE |
| BottomSheet.tsx | 8 | CORE |
| LargeActionButton.tsx | 6 | Sous-utilise |
| DarkActionButtonFlex.tsx | 6 | Sous-utilise |
| Tooltip.tsx | 4 | Utilise |
| CustomToast.tsx | 3 | Sous-utilise |
| PageBody.tsx | 3 | Sous-utilise |
| CircleButton.tsx | 3 | Sous-utilise |
| PillButton.tsx | 2 | Minimal |
| DarkActionButton.tsx | 2 | Minimal |
| SoftButton.tsx | 1 | Minimal |
| FloatingValuesButton.tsx | 0 | **INUTILISE** |

### 5.2 Badges de statut

- **1 seul composant centralise** : `components/rent-tracking/StatusPill.tsx` (PAID, PARTIAL, PENDING, OVERDUE)
- **40+ implementations inline** reparties dans le codebase

Statuts sans composant centralise : DRAFT, PUBLISHED, PENDING_REVIEW, REJECTED, ARCHIVED, OCCUPIED, VACANT, SIGNED, PENDING_SIGNATURE, SHORTLISTED, FINALIST, SELECTED

**CRITIQUE :** 1 composant vs 40+ inline = inconsistance majeure.

---

## 6. Formulaires

### 6.1 Inputs

**Pattern standard** (depuis `SoftInput.tsx`) :
```
border rounded-xl outline-none transition
border-input / focus:border-foreground
disabled:opacity-70 disabled:cursor-not-allowed
```

20 composants d'input dans `/components/inputs/` suivent ce pattern.

**Consistance : EXCELLENTE.** Labels flottants animes avec `peer-placeholder-shown:*`.

### 6.2 Labels

Pattern unifie :
- Type : Labels flottants (positionnes en absolu)
- Couleur : `text-muted-foreground` (normal), `text-red-500` (erreur)
- Animation : Scale-based (`scale-75` quand actif, `scale-100` quand placeholder visible)
- Taille : `text-base`

---

## 7. Espacement

### 7.1 Padding de page

| Classe | Occurrences | % |
|--------|-------------|---|
| `px-4` | 243 | 55% |
| `px-6` | 138 | 31% |
| `py-4` | 104 | — |
| `py-6` | 17 | — |
| `py-8` | 13 | — |
| `px-8` | 7 | 2% |

`px-4` domine (mobile). Pas de convention stricte pour le vertical.

### 7.2 Max-width

| Classe | Occurrences | Usage |
|--------|-------------|-------|
| `max-w-4xl` | 16 | Pages de contenu general |
| `max-w-5xl` | 9 | Pages account (AccountClientLayout) |
| `max-w-xs/sm/md` | 59 | Modales, petits containers |
| `max-w-2xl` | 12 | — |
| `max-w-3xl` | 10 | — |
| `max-w-7xl` | 2 | — |

Deux standards implicites : `max-w-4xl` (general) et `max-w-5xl` (account). Non documente.

---

## 8. Dark mode

### 8.1 Couverture

| Scope | Total fichiers | Avec dark: | Couverture |
|-------|----------------|------------|------------|
| `app/[locale]/` | 206 | 52 | **25%** |
| `components/` | 239 | 115 | **48%** |
| **Total** | **445** | **167** | **37.5%** |

**Total occurrences `dark:`** : 2 015 dans 167 fichiers.

### 8.2 Top 10 fichiers (plus de classes dark:)

| Fichier | dark: classes |
|---------|--------------|
| `account/tenant-profile/TenantProfileClient.tsx` | 103 |
| `properties/[listingId]/expenses/ExpensesClient.tsx` | 72 |
| `dashboard/my-rental/MyRentalClient.tsx` | 72 |
| `account/fiscal/FiscalClient.tsx` | 58 |
| `components/listings/ListingPreview.tsx` | 58 |
| `components/simulator/SimulatorForm.tsx` | 56 |
| `components/regularization/GuideSlides.tsx` | 47 |
| `components/simulator/ExpertSection.tsx` | 46 |
| `components/rent-tracking/RentDetailSheet.tsx` | 17 |
| `components/simulator/SimulatorResults.tsx` | 16 |

### 8.3 Pages a fort trafic SANS dark mode

- `listings/[listingId]/ListingClient.tsx` (0 dark:)
- `calendar/VisitsClient.tsx` (0 dark:)
- `favorites/FavoritesClient.tsx` (0 dark:)
- `contacts/ContactsClient.tsx` (1 dark:)
- `pricing/PricingClient.tsx` (2 dark:)

### 8.4 Pages admin SANS dark mode

- `admin/page.tsx` (0)
- `admin/reports/ReportsClient.tsx` (0)
- `admin/plans/PlanManagementClient.tsx` (0)
- `admin/polls/PollManagementClient.tsx` (0)
- `admin/listings/[listingId]/AdminListingDetailClient.tsx` (1)

### 8.5 Flow inspection SANS dark mode

- `inspection/[inspectionId]/rooms/page.tsx` (0)
- `inspection/[inspectionId]/deductions/page.tsx` (2)
- `inspection/[inspectionId]/page.tsx` (3)

### 8.6 Palette dark inconsistante

Pas de palette centralisee. Variations trouvees :
- Backgrounds : `dark:bg-neutral-800`, `dark:bg-neutral-700`, `dark:bg-neutral-900`, `dark:bg-neutral-800/50`
- Textes : `dark:text-white`, `dark:text-neutral-300`, `dark:text-neutral-400`

---

## 9. Responsive / Mobile-first

### 9.1 Approche

**446 occurrences de `md:`** (267 app/ + 179 components/). Approche mobile-first respectee. Aucun pattern desktop-first detecte.

### 9.2 Grids

82 `grid-cols-1` + 16 fichiers avec `md:grid-cols-*`. Pattern consistant : 1 colonne mobile, 2-3 colonnes desktop.

### 9.3 Tables

**101 elements `<table>`** detectes. ~81 sans wrapper `overflow-x-auto`.

Fichiers a risque :
- `account/fiscal/FiscalClient.tsx`
- `account/tax-simulator/TaxSimulatorClient.tsx`
- `admin/users/UserManagementClient.tsx`
- `admin/polls/PollManagementClient.tsx`
- `admin/listings/ListingModerationTable.tsx`
- `admin/reports/ReportsClient.tsx`
- `admin/users/[userId]/UserDetailClient.tsx`
- Pages inspection (20+)
- Composants simulateur (ResaleTab, FiscalImpactTab, LoanTab)

### 9.4 Modales

11+ modales avec patterns responsives. `w-full` mobile, `max-w-*` desktop. Generalement bien implemente.

### 9.5 Text responsive

82 occurrences de `md:text-*` dans 44 fichiers. Usage minimal — opportunite d'ajouter du responsive sur les headings.

### 9.6 Padding responsive

54 occurrences de `md:p-*` / `md:px-*` / `md:py-*` dans 33 fichiers. `container-custom` dans globals.css : `xl:px-20 md:px-10 sm:px-2 px-4`.

### 9.7 Navigation mobile/desktop

| Pattern | Occurrences | Fichiers |
|---------|-------------|----------|
| `hidden md:block` | 16 | Desktop-only |
| `md:hidden` | 23 | Mobile-only |

Implementation excellente et consistante.

### 9.8 Images

583 `w-full` + 95 fichiers avec `object-cover` / `aspect-*`. Excellent.

### 9.9 Flex responsive

16 occurrences de `flex-col md:flex-row`. Frequence basse attendue (grids preferes).

### 9.10 Safe areas

23 fichiers utilisent `pt-safe`, `pb-safe`, `pb-safe-nav`, `top-safe`. Bien implemente pour iOS PWA.

### 9.11 Touch targets

**142 elements interactifs sous les standards d'accessibilite** dans 62 fichiers.

| Taille | Pixels | WCAG | Occurrences |
|--------|--------|------|-------------|
| `w-4 h-4` | 16x16 | INACCEPTABLE | nombreux |
| `w-5 h-5` | 20x20 | INACCEPTABLE | nombreux |
| `w-6 h-6` | 24x24 | LIMITE | nombreux |
| `w-10 h-10` | 40x40 | BORDERLINE | — |
| `w-11 h-11` | 44x44 | CONFORME | — |

**Total : 142 occurrences sous 44x44px**

Top fichiers :
- `admin/users/[userId]/UserDetailClient.tsx` (25)
- `account/tax-simulator/TaxSimulatorClient.tsx` (13)
- `admin/components/ActivityFeed.tsx` (8)
- `components/finances/QuickLinks.tsx` (4)
- `components/listings/ListingCard.tsx` (4)
- `components/inspection/CameraCapture.tsx` (4)
- + 56 autres fichiers

### 9.12 Fixed bottom

12 fichiers avec `fixed bottom-0` ou `sticky bottom-0`. Usage correct : MobileMenu, BottomSheet, ListingMobileFooter, etc.

### 9.13 Overflow

355 occurrences dans 193 fichiers. `overflow-x-auto`, `overflow-y-auto`, `overflow-hidden` bien distribues. Sauf pour les tables (voir 9.3).

---

## 10. Inconsistances

### 10.1 shadcn vs custom

**0 composant shadcn.** 100% custom. Pas de conflit.

### 10.2 Composants coexistants

| Type | Nombre | Probleme |
|------|--------|----------|
| Boutons | 8 variantes + 4 specialises | Fragmentation |
| Modales/Dialogs | 22 fichiers | Modal.tsx + BottomSheet + specifiques |
| Cards | 17 fichiers | Aucun composant Card de base |
| Inputs | 5+ variantes | SoftInput standard + specialises |
| Skeletons | 1 | OK |
| Tooltips | 1 | OK |

### 10.3 Import paths

- **Imports absolus `@/`** : 1 191 (99.25%)
- **Imports relatifs `../`** : 9 (0.75%)

Fichiers avec imports relatifs :
- `ConversationClient.tsx` (3)
- `EditPropertyClient.tsx` (19)
- `TenantDashboardClient.tsx` (2)
- `admin/layout.tsx` (1)
- `calendar/page.tsx` (2)
- `ApplicationsClient.tsx` (1)
- `PropertiesClient.tsx` (2)
- `admin/page.tsx` (1)

### 10.4 Ordre des classes Tailwind

Inconsistant sur ~90% du codebase. Pas d'outil de tri automatique.

**Recommandation :** Installer `prettier-plugin-tailwindcss`.

### 10.5 Strings francais hardcodes (violations i18n)

**~45 occurrences dans 20+ fichiers :**

| String | Fichiers |
|--------|----------|
| "Confirmer" | VisitCard, UserDetailClient (x2), LandlordCalendarClient |
| "Supprimer" | PhotoTour, AllPhotosModal |
| "Enregistrer" | SaveListingMenu, EditSectionFooter |
| "Envoyer" | LeaseReceiptsSection, inspection/done |
| "Modifier" | inspection-theme, FavoritesClient |
| "Signaler" | ReportButton (x2) |
| "Ajouter" | inspection/deductions |
| "Fermer" | inspection-theme |
| "Voir l'annonce" | check-alerts API, ApplicationCard |
| "Voir les details" | ApplicationCard |
| "Voir plus/moins" | ListingPreview |
| "Nouveau sur Coridor" | LandlordProfileCard, ListingPreview |
| "Nouveau message" | messages API |
| "Photo envoyee" / "Fichier envoye" | messages API |
| "Renvoyer" | LeaseReceiptsSection |
| "Ajouter au calendrier" | AddToCalendarButton |
| "Continuer ma recherche" | applications API |

---

## Priorites de remediation

### Phase 1 — Critique (accessibilite + coherence couleurs)

| Action | Impact | Effort | Fichiers |
|--------|--------|--------|----------|
| Remplacer `green-*` par `emerald-*` | 175+ occurrences | Moyen | 50+ |
| Remplacer `gray-*` par `neutral-*` | 162+ occurrences | Faible | 20+ |
| Touch targets < 44px | 142 elements | Moyen | 62 |
| Supprimer shadows (remplacer par borders) | 132 occurrences | Faible | 30+ |

### Phase 2 — Haute priorite (composants + dark mode)

| Action | Impact | Effort | Fichiers |
|--------|--------|--------|----------|
| Creer composant StatusBadge centralise | 40+ inline | Moyen | 35 |
| Consolider variantes Button | 8 → 1 avec variantes | Moyen | 12 |
| Dark mode pages a fort trafic | ListingClient, VisitsClient, FavoritesClient | Eleve | 5+ |
| Tables : ajouter `overflow-x-auto` | 81 tables | Faible | 20-30 |

### Phase 3 — Moyen terme (polish)

| Action | Impact | Effort |
|--------|--------|--------|
| i18n strings hardcodes restants | 45 strings | Faible |
| Installer `prettier-plugin-tailwindcss` | Consistance classes | Faible |
| Documenter standards (max-w, padding, heading hierarchy) | Maintenabilite | Faible |
| Dark mode pages admin + inspection | Couverture 37% → 60%+ | Eleve |
| Supprimer `FloatingValuesButton.tsx` (0 imports) | Cleanup | Trivial |
| Supprimer font Boldonse (jamais utilise) | Cleanup | Trivial |
| Migrer `border-slate-*` admin vers `border-neutral-*` | 85 occurrences | Faible |
| Convertir imports relatifs en absolus | 9 imports | Trivial |
