# Réorganisation Pages — Dashboard + Agenda + Finances

## ⚠️ RÈGLE ABSOLUE : NE SUPPRIMER AUCUNE PAGE

Ce prompt modifie le **contenu** de 3 pages existantes. Aucune page, aucune route, aucun composant n'est supprimé. Les pages retirées de certaines vues restent accessibles via leur URL directe.

## ⚠️ RÈGLE ABSOLUE : NE PAS TOUCHER AU DESIGN EXISTANT

Le design actuel du Dashboard et de l'Agenda a été soigneusement travaillé manuellement. Claude Code **NE DOIT PAS modifier le design, le style, les classes CSS, les couleurs, les tailles, le padding, les marges, les animations, ni le layout** des composants existants. On ajoute ou on retire des composants, on ne redesigne RIEN.

**DASHBOARD — Ne pas toucher au design de :**
- Le header "Bonjour Adrien" (design, couleurs, layout)
- Les ActionCards (Loyer en retard, EDL en cours — design intact)
- Les KPIs mensuels (Revenus, Loyers, Dépenses — design intact)
- Tout ce qui a déjà été redesigné

**DASHBOARD — Champ libre pour modifier :**
- Le widget Rappels Légaux (peut être modifié/remplacé)
- Le widget Paiements (peut être modifié/remplacé)
- La section Finances & Reporting (peut être modifiée)

**AGENDA — Ne pas toucher au design existant :**
- Le calendrier/carte des visites (design intact)
- Le layout général de la page
- Les composants de visites existants
- Claude Code doit s'adapter au design actuel et ajouter les nouveaux éléments EN COHÉRENCE avec ce qui existe déjà

**FINANCES — Champ libre** mais respecter le design system du site (couleurs, radius, typographie, spacing).

**Convention :** ce prompt utilise les team agents (sub-agents) pour l'exécution parallèle.

---

## ORGANISATION EN TEAM AGENTS

### Agent 1 — Dashboard (Activités) : retirer les doublons, recentrer sur l'actionnable

**Mission :** Retirer la liste complète des biens (dupliquée avec Annonces). Garder uniquement les résumés actionnables. Le dashboard = "qu'est-ce que je dois faire aujourd'hui ?"

### Agent 2 — Agenda enrichi : rappels légaux + échéances paiement

**Mission :** Enrichir la page Agenda avec les rappels légaux importants et les échéances de paiement des loyers. L'Agenda = "qu'est-ce qui se passe bientôt ?" — pas juste les visites.

### Agent 3 — Finances : récap fiscal en onglet + quittances + liens simulateurs

**Mission :** Ajouter un onglet "Fiscal" dans la page /finances (contenu de l'ancien Récap Fiscal). Ajouter un accès aux Quittances. Ajouter des liens vers les Simulateurs.

---

## AGENT 1 — DASHBOARD (ACTIVITÉS)

### Problème actuel

Le dashboard affiche une **liste complète des biens** (avec photo, nom, adresse, statut, locataire) qui est identique à ce qu'affiche la page Annonces. Le proprio voit la même chose dans deux onglets différents.

En plus, le dashboard contient :
- Le header "Bonjour Adrien" avec les alertes
- Les ActionCards (loyer en retard, EDL en cours)
- Les KPIs mensuels (Revenus, Loyers, Dépenses)
- La liste complète des biens ← DOUBLON
- Le widget Rappels Légaux
- Le widget Paiements
- La section Finances & Reporting (dépliable)

### Ce qui change

**RETIRER du dashboard :**
- La **liste complète "Mes biens"** — elle est dans Annonces. Le proprio n'a pas besoin de voir 10 cards de biens sur le dashboard.

**REMPLACER par :**
- Les **biens qui ont quelque chose en cours** uniquement. Si un bien a un loyer en retard, une candidature en attente, un EDL en cours, un rappel légal urgent → il apparaît. Si tout va bien → il n'apparaît pas sur le dashboard.
- C'est le même principe que les ActionCards mais étendu : chaque bien "actif" montre SON action/alerte.

### ⚠️ DESIGN EXISTANT — NE PAS TOUCHER

Le design du dashboard a été travaillé manuellement par le fondateur. **Aucune modification de style, de layout, de couleur, de taille, de spacing sur les composants existants.**

**INTERDIT de modifier le design de :**
- Le header "Bonjour Adrien" (style, taille, position, message contextuel)
- Les ActionCards (alertes loyer en retard, EDL en cours — design, couleurs, animations)
- Les KPIs mensuels (Revenus, Loyers, Dépenses — les 3 cards avec barres de progression)
- Le widget Paiements (card rouge avec le compteur)

**AUTORISÉ à modifier :**
- La section "Rappels Légaux" → peut être remplacée par le mini-widget "Prochaines échéances"
- La section "Finances & Reporting" dépliable → peut être modifiée
- La liste "Mes biens" → RETIRÉE (c'est le but de ce chantier)

**En résumé : on RETIRE la liste des biens, on REMPLACE le widget Rappels par un mini-widget, on peut toucher Finances & Reporting. RIEN D'AUTRE.**

**RETIRER du dashboard :**
- Le widget "Rappels Légaux" → il sera dans l'Agenda enrichi (Agent 2). Garder un **lien** "Voir les rappels →" qui pointe vers l'Agenda, mais pas le widget complet.

### Layout résultant du dashboard

```
┌──────────────────────────────────────────────────────┐
│  Bonjour Adrien 👋                              [+]  │  ← NE PAS TOUCHER
│  1 loyer en retard                                    │
│  12 logements · 1 occupé                              │
├──────────────────────────────────────────────────────┤
│  🔴 Loyer en retard — Appt Lumineux · Michelle S.   │  ← NE PAS TOUCHER
│  ⚪ Reprendre EDL en cours — Appt Lumineux · 1/5     │
├──────────────────────────────────────────────────────┤
│  [Revenus 0€]  [Loyers 0/1]  [Dépenses 0€]          │  ← NE PAS TOUCHER
│   sur 729€      1 en retard    ce mois                │
├──────────────────────────────────────────────────────┤
│  📋 Paiements                     Voir le détail →   │  ← MODIFIABLE
│  ⚠️ 1 loyer en retard ce mois                  [1]   │
├──────────────────────────────────────────────────────┤
│  📅 Prochaines échéances              Voir tout →    │  ← NOUVEAU (remplace
│  🟡 Déclaration revenus fonciers       dans 2 mois   │     l'ancien widget
│  🟡 Régularisation charges            dans 10 mois   │     Rappels Légaux)
├──────────────────────────────────────────────────────┤
│  📊 Finances & Reporting                      [▼]    │  ← MODIFIABLE
│  (contenu inchangé quand déplié)                      │
└──────────────────────────────────────────────────────┘
```

**SUPPRIMÉ :** la section "Mes biens" avec toutes les cards propriétés.

### Ce qui disparaît

La section "Mes biens" avec les cards :
```
❌  Chambre 1 — 133 Rue Simone Veil — Vacant
❌  Studio Indépendant — 10 Rue de Rivoli — Vacant  
❌  Belle Maison Lyon — 2 rue carquillat — Vacant
❌  Super appartement — 21 Rue Jules Guesde — Vacant
❌  Appartement Lumineux — 17 Rue Jules Guesde — Occupé
```
→ Tout ça est dans l'onglet Annonces de la navbar.

### Mini-widget "Prochaines échéances"

Remplace le widget Rappels Légaux complet. Affiche seulement les **2-3 prochains rappels** avec un lien "Voir tout →" qui navigue vers la page Agenda.

- Titre : "Prochaines échéances"
- "Voir tout →" : lien vers `/agenda` ou la route de l'Agenda
- Chaque ligne : point coloré (🔴🟡🟢) + titre court + "dans X mois/jours"
- Maximum 3 lignes visibles
- Si aucun rappel → ne pas afficher le widget (pas de "Tout est en ordre" ici, c'est déjà dans les ActionCards)
- **Design :** même style que les autres widgets du dashboard (card blanche, rounded-2xl, border, padding)

### Identifier les fichiers

```bash
# Le composant principal du dashboard
grep -rl "DashboardClient\|Bonjour.*Adrien\|PropertyStatusList\|Mes biens" app/ components/ --include="*.tsx" | head -15

# La liste des biens dans le dashboard
grep -rl "PropertyStatusList\|PropertyCard.*dashboard\|Mes biens" components/ --include="*.tsx" | head -10

# Le widget Rappels Légaux dans le dashboard
grep -rl "LegalReminders\|Rappels légaux\|Rappels legaux" components/dashboard/ --include="*.tsx" | head -10
```

### ⚠️ NE PAS MODIFIER — Dashboard
- Le design de AUCUN composant existant (header, ActionCards, KPIs, widget Paiements)
- Pas de changement de style, layout, couleur, taille, spacing, animation sur ces composants
- La page Annonces (ex-Locations) — elle affiche déjà la liste des biens
- Les ActionCards — elles restent telles quelles
- Les KPIs mensuels — ils restent tels quels
- Les composants PropertyStatusList / PropertyCard → ne pas les supprimer, juste ne plus les importer dans le dashboard

---

## AGENT 2 — AGENDA ENRICHI

### Problème actuel

L'Agenda n'affiche que les visites. Quand le proprio n'a pas de visite prévue, la page est vide ("Aucune visite à venir") avec un historique des visites passées. C'est inutile 90% du temps pour un proprio dont les biens sont loués.

En parallèle, les rappels légaux (diagnostics, déclaration fiscale, régularisation charges) sont cachés dans Paramètres. Et les échéances de paiement (loyers attendus) sont dans le dashboard mais pas dans un calendrier.

### Ce qui change

**⚠️ RÈGLE DESIGN AGENDA : le design actuel de l'Agenda a été travaillé manuellement. Claude Code doit s'adapter au design existant — pas le remplacer. Les nouveaux éléments (filtres, événements paiement, événements rappels) doivent visuellement s'intégrer DANS le design existant de la page, en utilisant les mêmes styles, couleurs, radius, typographie, spacing que ce qui est déjà en place. Avant de coder, LIRE le code existant de la page Agenda et en reprendre le design system.**

L'Agenda devient le **hub temporel** — tout ce qui a une date et qui concerne le proprio y apparaît :

1. **Les visites** (existant, inchangé)
2. **Les rappels légaux importants** (NOUVEAU — récupérés depuis le système de rappels existant)
3. **Les échéances de paiement des loyers** (NOUVEAU — récupérées depuis le suivi des paiements existant)

**NE PAS inclure :** les dépenses récurrentes (elles sont dans le widget "À venir" de la page Dépenses & Charges par bien).

### Layout résultant

```
┌──────────────────────────────────────────────────────┐
│  CORIDOR                                    🔔 [3]   │
├──────────────────────────────────────────────────────┤
│  [ Aucune visite à venir - carte/calendrier ]        │  ← existant, inchangé
├──────────────────────────────────────────────────────┤
│                                                      │
│  [Tous] [Visites] [Échéances] [Rappels]              │  ← NOUVEAUX FILTRES
│                                                      │
├──────────────────────────────────────────────────────┤
│  Mardi 11 Mars 2026                                  │
│                                                      │
│  💰 Loyer attendu — Appt Lumineux               729€│  ← NOUVEAU
│     Michelle S. · Dû le 5 mars · En retard 🔴       │
│                                                      │
├──────────────────────────────────────────────────────┤
│  Mai 2026                                            │
│                                                      │
│  📋 Déclaration revenus fonciers 2025                │  ← NOUVEAU
│     Échéance ~20 mai · IMPORTANT 🟡                  │
│                                                      │
├──────────────────────────────────────────────────────┤
│  Décembre 2026                                       │
│                                                      │
│  ⚖️ Régularisation annuelle des charges              │  ← NOUVEAU
│     Appt Lumineux · Échéance 31 déc. · IMPORTANT 🟡 │
│                                                      │
├──────────────────────────────────────────────────────┤
│  Février 2027                                        │
│                                                      │
│  📝 Revision annuelle du loyer (IRL)                 │  ← NOUVEAU
│     Appt Lumineux · Échéance 2 fév. · IMPORTANT 🟡  │
│                                                      │
│  🛡 Vérification assurance locataire                 │  ← NOUVEAU
│     Appt Lumineux · Échéance 2 fév. · MOYEN 🟢      │
│                                                      │
├──────────────────────────────────────────────────────┤
│  Lundi 2 Mars 2026  (passé)                          │
│                                                      │
│  📅 Visites                                          │  ← existant
│     Créneaux ouverts 09:00-12:00                     │
│     au 21 Rue Jules Guesde, Levallois                │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Filtres par type

Ajouter une rangée de pills sous le calendrier/carte des visites :

```
[Tous] [Visites] [Échéances] [Rappels]
```

- **Tous** : affiche tout (visites + échéances paiement + rappels légaux)
- **Visites** : seulement les visites (comportement actuel)
- **Échéances** : seulement les échéances de paiement
- **Rappels** : seulement les rappels légaux

**Style des pills :** même style que les filtres existants dans l'app (actif = fond noir texte blanc, inactif = border gris texte gris)

### Événements "Échéances de paiement"

Récupérer les loyers attendus depuis le système existant (`RentPaymentTracking`) :

```typescript
// Données à récupérer
interface PaymentEvent {
  type: "PAYMENT_DUE";
  propertyTitle: string;
  tenantName: string;
  amount: number;
  dueDate: Date;
  status: "PENDING" | "OVERDUE" | "PAID";
}
```

**Affichage :**
- Icône : 💰
- Titre : "Loyer attendu — {bien}"
- Sous-titre : "{locataire} · Dû le {date} · {statut}"
- Statut couleur : 🟢 Payé, 🟡 En attente, 🔴 En retard
- Si payé → la ligne est grisée/barrée ou dans une section "Complétés" dépliable

**Source de données :** réutiliser la requête existante qui alimente le widget Paiements du dashboard. Ne pas créer une nouvelle requête.

### Événements "Rappels légaux"

Récupérer les rappels depuis le système existant (`LegalReminder`) :

```typescript
// Données à récupérer  
interface LegalReminderEvent {
  type: "LEGAL_REMINDER";
  title: string;           // "Déclaration revenus fonciers"
  propertyTitle?: string;  // null si global (déclaration fiscale)
  dueDate: Date;
  priority: "CRITICAL" | "HIGH" | "MEDIUM";
  status: "PENDING" | "UPCOMING" | "OVERDUE" | "COMPLETED";
  category: "DIAGNOSTICS" | "BAIL" | "CHARGES" | "FISCALITE";
}
```

**Affichage :**
- Icône selon catégorie : 📋 Fiscalité, ⚖️ Charges, 📝 Bail, 🏠 Diagnostics
- Titre : le titre du rappel
- Sous-titre : "{bien} · Échéance {date} · {priorité}"
- Priorité couleur : 🔴 CRITIQUE, 🟡 IMPORTANT, 🟢 MOYEN
- Les rappels COMPLÉTÉS ne s'affichent pas (ou dans une section dépliable "Complétés")

**Source de données :** réutiliser la requête existante qui alimente la page Rappels Légaux. Ne pas créer une nouvelle requête.

**Seulement les rappels importants :** filtrer les rappels pour n'afficher que ceux avec priorité CRITICAL ou HIGH. Les rappels MEDIUM n'apparaissent pas dans l'Agenda (toujours accessibles via la page Rappels Légaux complète via URL).

### Timeline unifiée

Tous les événements (visites + paiements + rappels) sont affichés dans une **timeline chronologique unique**, groupés par date :

- Événements futurs en premier (du plus proche au plus lointain)
- Événements passés en dessous (du plus récent au plus ancien), dans une section "Passé" dépliable
- Séparateur par jour ou par mois selon la densité :
  - Si plusieurs événements le même jour → grouper par jour ("Mardi 11 Mars 2026")
  - Si événements espacés → grouper par mois ("Mai 2026", "Décembre 2026")

### Identifier les fichiers

```bash
# La page Agenda existante
find app -path "*agenda*" -name "*.tsx" -o -path "*calendar*" -name "*.tsx" | head -15

# Le composant client de l'agenda
grep -rl "AgendaClient\|CalendarClient\|Aucune visite" app/ components/ --include="*.tsx" | head -10

# Le service/action qui récupère les visites
grep -rl "getVisits\|getCalendarEvents\|getAgenda" app/ --include="*.ts" | head -10

# Le service rappels légaux (pour réutiliser la requête)
grep -rl "getLegalReminders\|getReminders\|ReminderEngine" app/ services/ --include="*.ts" | head -10

# Le service paiements (pour réutiliser la requête)
grep -rl "getRentTracking\|getPaymentTracking\|RentCollection" app/ services/ --include="*.ts" | head -10
```

### ⚠️ DESIGN EXISTANT — NE PAS TOUCHER

Le design de l'Agenda a été retravaillé manuellement par le fondateur. **Claude Code doit s'adapter au design existant, pas le remplacer.**

**INTERDIT de modifier le design de :**
- Le header/titre de la page Agenda
- Le calendrier/carte des visites (le composant en haut avec "Aucune visite à venir")
- Les cards de visites existantes (style, couleurs, layout)
- La typographie, les couleurs, le spacing général de la page

**Les nouveaux éléments (filtres, échéances, rappels) doivent :**
- Utiliser le MÊME design system que les composants existants de l'Agenda
- Respecter les mêmes border-radius, paddings, tailles de texte, couleurs
- S'intégrer visuellement comme si c'était prévu depuis le début
- **Lire le code existant de la page Agenda AVANT de coder** pour comprendre les styles utilisés

### ⚠️ NE PAS MODIFIER — Agenda
- La page Rappels Légaux elle-même (toujours accessible via URL)
- Le système de rappels (ReminderEngine, crons, etc.)
- Le système de suivi des paiements
- Le composant calendrier/carte des visites existant (garder tel quel, ajouter les nouveaux événements EN DESSOUS)
- Le design existant de la page Agenda (styles, couleurs, layout, typographie)

---

## AGENT 3 — FINANCES RÉORGANISÉE

### Problème actuel

La page /finances a 3 onglets (Revenus, Loyers, Dépenses). Le Récap Fiscal est une page séparée dans Paramètres. Les Quittances sont une autre page séparée dans Paramètres. Le Simulateur Fiscal est encore une autre page. Tout ce qui touche à l'argent est dispersé.

### Ce qui change

La page /finances devient le **hub financier complet** en ajoutant :

1. Un **onglet "Fiscal"** (NOUVEAU — contenu de l'ancien Récap Fiscal)
2. Une **section "Quittances"** (NOUVEAU — lien vers la page Quittances existante ou intégration directe)
3. Des **liens vers les Simulateurs** (NOUVEAU)

### Design — Champ libre mais cohérent

L'Agent 3 a le champ libre pour le design de l'onglet Fiscal et des liens. Mais il DOIT :
- **Respecter le design system existant du site** (border-radius, couleurs, typographie, spacing)
- **Regarder les 3 onglets existants de /finances** (Revenus, Loyers, Dépenses) et s'aligner visuellement
- Utiliser les mêmes composants (cards, pills, tableaux) que le reste de /finances
- Ne pas introduire de styles ou couleurs qui n'existent pas déjà dans l'app

### Nouvel onglet "Fiscal"

La page /finances passe de 3 à 4 onglets :

```
[ Revenus | Loyers | Dépenses | Fiscal ]
```

Le contenu de l'onglet "Fiscal" est **exactement le même** que la page Récap Fiscal existante (`account/fiscal/FiscalClient.tsx`), mais intégré comme onglet dans /finances.

**Implémentation — 2 options :**

**Option A (recommandée — la plus simple) :** Importer le composant `FiscalClient` existant dans l'onglet Fiscal de /finances. Pas de réécriture, juste une intégration.

```typescript
// Dans FinancesClient.tsx, onglet Fiscal :
import FiscalClient from '@/app/[locale]/account/fiscal/FiscalClient';

// Dans le tab "Fiscal" :
<FiscalClient /> // Le même composant, réutilisé
```

**Option B :** Créer un nouveau composant `FiscalTab.tsx` dans `components/finances/` qui reprend le layout du récap fiscal mais adapté au contexte de /finances (sans le header "Récap fiscal 2025", puisque le contexte est déjà donné par la page /finances).

**Choisir l'option A sauf si le composant FiscalClient a des dépendances spécifiques au layout Mon Compte.**

**Ajustements si Option A :**
- Le sélecteur d'année de FiscalClient devrait utiliser le même sélecteur que le reste de /finances (synchronisé)
- Le filtre par bien de FiscalClient utilise des **adresses** → les remplacer par les **noms des biens** (le même bug identifié dans l'audit)
- Les boutons CSV/PDF sont déjà dans FiscalClient → les garder

### Accès Quittances

**Option simple (recommandée) :** Ajouter un lien "Quittances" visible dans le header de /finances ou sous les onglets :

```
[ Revenus | Loyers | Dépenses | Fiscal ]

📄 Quittances →        📊 Simulateur fiscal →
```

Ces liens naviguent vers les pages existantes (`/account/quittances`, `/account/tax-simulator`). Pas d'intégration, juste des raccourcis.

**Positionnement :** sous les onglets, alignés à droite, en texte discret (`text-sm text-neutral-500`). Ou dans un menu "⋯" en haut à droite de la page.

### Liens Simulateurs

Ajouter dans le même espace que les Quittances :

- "Simulateur fiscal →" → `/account/tax-simulator`
- "Simulateur investissement →" → `/account/investment-simulator`

Ces liens sont des **raccourcis de navigation**, pas des intégrations. Les pages restent où elles sont.

### Identifier les fichiers

```bash
# La page /finances et ses composants
find app components -path "*finance*" -name "*.tsx" | head -20

# Le composant client principal de /finances
grep -rl "FinancesClient\|activeTab.*revenue\|activeTab.*rent\|activeTab.*expenses" app/ components/ --include="*.tsx" | head -10

# Le composant FiscalClient (celui à intégrer)
find app components -name "*FiscalClient*" -o -name "*fiscal*Client*" | head -10

# La page Quittances
find app -path "*quittance*" -name "*.tsx" | head -10
```

### ⚠️ NE PAS MODIFIER
- La page Récap Fiscal existante (`/account/fiscal`) — elle continue d'exister
- La page Quittances existante — elle continue d'exister
- Les pages Simulateurs — elles continuent d'exister
- Les 3 onglets existants de /finances (Revenus, Loyers, Dépenses) — ils restent intacts
- Le composant FiscalClient — ne pas le modifier, l'importer tel quel

---

## VÉRIFICATIONS

### Agent 1 — Dashboard
- [ ] La liste complète "Mes biens" est retirée du dashboard
- [ ] Les ActionCards sont inchangées
- [ ] Les KPIs mensuels sont inchangés
- [ ] Le widget Paiements est inchangé
- [ ] Le widget Rappels Légaux complet est remplacé par le mini-widget "Prochaines échéances" (2-3 lignes max + lien "Voir tout →")
- [ ] La section Finances & Reporting dépliable est inchangée
- [ ] Le lien "Voir tout →" du mini-widget navigue vers l'Agenda
- [ ] Les composants de la liste des biens ne sont PAS supprimés (juste non importés dans le dashboard)
- [ ] La page Annonces (ex-Locations) fonctionne toujours avec la liste complète des biens

### Agent 2 — Agenda
- [ ] Les visites existantes s'affichent toujours
- [ ] Le calendrier/carte existant est inchangé
- [ ] Les pills de filtres [Tous | Visites | Échéances | Rappels] sont ajoutés
- [ ] Les échéances de paiement (loyers attendus) apparaissent dans la timeline
- [ ] Les rappels légaux importants (CRITICAL + HIGH) apparaissent dans la timeline
- [ ] La timeline est triée chronologiquement (futur en premier)
- [ ] Les événements passés sont dans une section dépliable
- [ ] Les filtres fonctionnent correctement
- [ ] Les données sont récupérées via les services existants (pas de nouvelles requêtes)
- [ ] La page Rappels Légaux existante fonctionne toujours

### Agent 3 — Finances
- [ ] L'onglet "Fiscal" est ajouté dans /finances (4 onglets au total)
- [ ] L'onglet Fiscal affiche le contenu du Récap Fiscal existant
- [ ] Le filtre par bien utilise les noms (pas les adresses)
- [ ] Les liens Quittances / Simulateur fiscal / Simulateur investissement sont visibles
- [ ] Les 3 onglets existants (Revenus, Loyers, Dépenses) sont INTACTS
- [ ] La page Récap Fiscal existante (`/account/fiscal`) fonctionne toujours
- [ ] Le query param `?tab=fiscal` fonctionne pour accéder directement à l'onglet

### Global
- [ ] `npm run build` → 0 erreurs
- [ ] Toutes les pages existantes fonctionnent toujours via leur URL directe
- [ ] La navigation (navbar, liens internes, deep links) fonctionne
- [ ] Mobile 375px : rien ne déborde
- [ ] Le dashboard est plus court (pas de liste de biens) et plus actionnable
- [ ] L'Agenda affiche des événements même quand il n'y a pas de visite
