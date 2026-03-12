# Réorganisation Navigation — Navbar + Nettoyage Paramètres

## ⚠️ RÈGLE ABSOLUE : NE SUPPRIMER AUCUNE PAGE

Ce prompt réorganise la **navigation** (liens, menus, onglets). Aucune page, aucun composant, aucune route n'est supprimée. On change où les liens pointent et ce qui est visible, pas ce qui existe.

**Convention :** ce prompt utilise les team agents (sub-agents) pour l'exécution parallèle.

---

## Contexte

La navbar mobile actuelle :
```
📅 Agenda | 🏠 Locations | 📊 Activités | 💬 Messages | ⚙️ Paramètres
```

La nouvelle navbar :
```
📅 Agenda | 🏠 Annonces | 📊 Activités | 💬 Messages | 💰 Finances
```

**3 changements :**
1. "Locations" → renommé "Annonces" (même page, même route, juste le label et l'icône)
2. "Paramètres" → remplacé par "Finances" (pointe vers `/finances`)
3. Paramètres devient accessible depuis l'avatar/profil en haut de l'écran

En parallèle, la sidebar Paramètres (Mon Compte) est nettoyée : les items de gestion locative en sont retirés (ils restent accessibles via d'autres chemins).

---

## ORGANISATION EN TEAM AGENTS

### Agent 1 — Navbar (renommer + remplacer)

**Mission :** Modifier la navbar mobile (bottom tabs) et la navigation desktop (sidebar/header). Renommer Locations → Annonces. Remplacer Paramètres par Finances.

### Agent 2 — Accès Paramètres depuis le profil

**Mission :** Ajouter un accès aux Paramètres depuis l'avatar/profil utilisateur en haut de l'écran, visible sur toutes les pages. Le proprio doit pouvoir accéder à ses settings sans l'onglet navbar.

### Agent 3 — Nettoyage sidebar Paramètres

**Mission :** Retirer les items de gestion locative de la page Paramètres/Mon Compte. Ces pages continuent d'exister et d'être accessibles via leur URL — on retire juste les liens de la sidebar Mon Compte.

---

## AGENT 1 — NAVBAR

### Identifier les fichiers

```bash
# Navigation mobile (bottom tabs)
grep -rl "Locations\|Paramètres\|Activités\|Messages\|Agenda" components/ --include="*.tsx" | grep -i "nav\|menu\|tab\|bar\|bottom" | head -20

# Navigation desktop (sidebar, header)
grep -rl "Locations\|Paramètres" components/ --include="*.tsx" | grep -i "sidebar\|header\|layout" | head -20

# Le composant MobileMenu ou BottomNav
find components app -name "*obileMenu*" -o -name "*ottomNav*" -o -name "*ottomTab*" -o -name "*avigation*" | head -15
```

### Modification 1 — "Locations" → "Annonces"

Trouver l'onglet "Locations" dans la navbar mobile et le renommer :

- **Label :** "Locations" → "Annonces"
- **Icône :** garder la même icône (bâtiment/maison) ou changer pour une icône qui évoque mieux les annonces (Lucide `Megaphone` ou `LayoutGrid` ou garder `Building2`)
- **Route :** INCHANGÉE — pointe toujours vers la même page (probablement `/properties` ou `/locations`)
- **Desktop sidebar :** même renommage si le label "Locations" apparaît aussi dans la sidebar desktop

**Chercher toutes les occurrences du label "Locations" dans la navigation :**
```bash
grep -rn '"Locations"\|label.*Locations\|Locations.*label' components/ app/ --include="*.tsx" | grep -v node_modules | head -20
```

### Modification 2 — "Paramètres" → "Finances"

Remplacer l'onglet "Paramètres" dans la navbar mobile :

- **Label :** "Paramètres" → "Finances"
- **Icône :** remplacer l'icône engrenage (⚙️) par une icône finance (Lucide `BarChart3` ou `Wallet` ou `TrendingUp`)
- **Route :** changer de la route paramètres/account vers `/finances` (la page Finances consolidée existante)
- **Actif :** le tab est actif quand la route commence par `/finances`

**Chercher toutes les occurrences de Paramètres dans la navigation :**
```bash
grep -rn '"Paramètres"\|label.*Paramètres\|Settings\|settings.*href\|account.*href' components/ app/ --include="*.tsx" | grep -i "nav\|menu\|tab\|bar\|bottom\|sidebar" | head -20
```

### Navigation desktop

Appliquer les mêmes changements sur la navigation desktop si elle existe (sidebar, header links). Chercher :
```bash
grep -rl "Locations\|Paramètres\|Settings\|account" components/ --include="*.tsx" | grep -i "sidebar\|header\|desktop\|layout" | head -15
```

### ⚠️ NE PAS MODIFIER

- La route/page `/properties` ou `/locations` elle-même — juste son label dans la nav
- La route/page `/account` ou `/settings` — elle existe toujours, juste plus dans la navbar
- La page `/finances` — elle existe déjà, on y pointe juste depuis la navbar
- Aucun autre composant que les composants de navigation

---

## AGENT 2 — ACCÈS PARAMÈTRES DEPUIS LE PROFIL

### Le problème

Paramètres n'est plus dans la navbar. Le proprio doit quand même pouvoir y accéder facilement.

### La solution

Ajouter un point d'accès aux Paramètres depuis le **header/profil** en haut de l'écran.

**Trouver le header existant :**
```bash
# Le header avec l'avatar/profil
grep -rl "avatar\|Avatar\|profil\|Profile\|Adrien\|firstName" components/ --include="*.tsx" | grep -i "header\|top\|nav\|bar" | head -15

# Le composant qui affiche le nom de l'utilisateur en haut
grep -rn "Bonjour\|bonjour\|greeting\|userName\|firstName" components/ app/ --include="*.tsx" | head -15
```

### Implémentation — Desktop

Sur desktop, le header ou la sidebar affiche déjà le profil utilisateur (avatar + nom). Ajouter un lien vers `/account` (la page Paramètres) :

- Si le header a un avatar cliquable → ajouter un dropdown avec "Paramètres" comme item
- Si le header a le nom de l'utilisateur → le rendre cliquable vers `/account`
- Si rien de tel n'existe → ajouter un petit avatar/icône engrenage en haut à droite du header

### Implémentation — Mobile

Sur mobile, plusieurs options selon ce qui existe déjà :

**Option A (préférée) :** Si le header mobile a déjà un avatar ou un bouton profil → ajouter un lien vers Paramètres dans le menu qui s'ouvre au tap.

**Option B :** Si le header mobile n'a pas d'avatar → ajouter un petit avatar rond (ou icône engrenage) en haut à droite de l'écran, visible sur toutes les pages. Tap → navigation vers `/account`.

**Option C :** Sur la page Activités (dashboard), le "Bonjour Adrien 👋" en haut est déjà lié au profil. S'assurer que c'est cliquable et mène vers `/account`. Ajouter un chevron › pour signifier que c'est cliquable.

**Specs du bouton profil/paramètres (si nouveau composant) :**
- Avatar rond : 32×32px sur mobile, 36×36px sur desktop
- Si l'utilisateur a un avatar → l'afficher
- Si pas d'avatar → cercle avec initiales ou icône User
- Tap → navigue vers `/account`
- Positionné en haut à droite, avant l'icône notifications (cloche)

### ⚠️ NE PAS MODIFIER

- La page `/account` elle-même — elle existe toujours
- Le contenu de la page Paramètres — juste l'accès change
- Le dashboard — ne pas modifier le contenu, juste s'assurer que le profil est cliquable

---

## AGENT 3 — NETTOYAGE SIDEBAR PARAMÈTRES

### Le problème

La sidebar Mon Compte contient 3 sections :
- **MON COMPTE** : Identité & documents, Connexion et sécurité, Abonnement
- **GESTION LOCATIVE** : Finances, Récap fiscal, Quittances, Rappels légaux, Simulateur fiscal, Simulateur investissement, Mes simulations
- **PRÉFÉRENCES** : Notifications, Confidentialité, Préférences générales, Réglages

La section "GESTION LOCATIVE" n'a rien à faire dans les paramètres du compte. Ces pages sont de la gestion opérationnelle, pas du paramétrage.

### Ce qu'il faut faire

**Retirer de la sidebar Paramètres les items suivants :**
- Finances (maintenant dans la navbar)
- Récap fiscal (sera intégré dans /finances plus tard — pour l'instant accessible via URL)
- Quittances (sera intégré dans /finances plus tard — pour l'instant accessible via URL)
- Rappels légaux (sera intégré dans l'Agenda plus tard — pour l'instant accessible via URL)
- Simulateur fiscal (accessible via /finances ou URL directe)
- Simulateur investissement (accessible via URL directe)
- Mes simulations (accessible via URL directe)

**Retirer toute la section "GESTION LOCATIVE"** de la sidebar.

**Garder :**
```
MON COMPTE
  Identité & documents
  Connexion et sécurité
  Abonnement

PRÉFÉRENCES
  Notifications
  Confidentialité
  Préférences générales
  Réglages

Aide & contact
```

### Identifier les fichiers

```bash
# La sidebar/menu de la page account/settings
find app components -name "*AccountSidebar*" -o -name "*SettingsSidebar*" -o -name "*AccountMenu*" -o -name "*AccountLayout*" | head -10

# Ou chercher les labels
grep -rl "GESTION LOCATIVE\|Récap fiscal\|Rappels légaux\|Simulateur fiscal\|Mes simulations" components/ app/ --include="*.tsx" | head -15
```

### Implémentation

Dans le composant sidebar de la page account :

1. Trouver le tableau/array qui définit les items du menu
2. Retirer les 7 items de la section "GESTION LOCATIVE"
3. Retirer le header de section "GESTION LOCATIVE" lui-même
4. **NE PAS supprimer les routes/pages** — juste les entrées dans le menu sidebar

**Exemple de ce qui change :**
```typescript
// AVANT
const menuItems = [
  { section: "MON COMPTE", items: [
    { label: "Identité & documents", href: "/account/identity", icon: FileText },
    { label: "Connexion et sécurité", href: "/account/security", icon: Shield },
    { label: "Abonnement", href: "/account/subscription", icon: Sparkles },
  ]},
  { section: "GESTION LOCATIVE", items: [
    { label: "Finances", href: "/finances", icon: BarChart3 },
    { label: "Récap fiscal", href: "/account/fiscal", icon: Receipt },
    // ... 5 autres items
  ]},
  { section: "PRÉFÉRENCES", items: [...] },
];

// APRÈS
const menuItems = [
  { section: "MON COMPTE", items: [
    { label: "Identité & documents", href: "/account/identity", icon: FileText },
    { label: "Connexion et sécurité", href: "/account/security", icon: Shield },
    { label: "Abonnement", href: "/account/subscription", icon: Sparkles },
  ]},
  // GESTION LOCATIVE supprimée d'ici
  { section: "PRÉFÉRENCES", items: [...] },
];
```

### ⚠️ NE PAS MODIFIER

- Les pages elles-mêmes (`/account/fiscal`, `/account/quittances`, `/account/legal-reminders`, etc.) — elles continuent d'exister et d'être accessibles via URL
- Les routes API associées
- Les composants de ces pages
- Seulement les liens dans la sidebar Mon Compte sont retirés

---

## VÉRIFICATIONS

### Agent 1 — Navbar
- [ ] Le label "Locations" est devenu "Annonces" dans la navbar mobile
- [ ] Le label "Locations" est devenu "Annonces" dans la navigation desktop (si applicable)
- [ ] L'onglet "Paramètres" est remplacé par "Finances" dans la navbar mobile
- [ ] L'onglet "Finances" pointe vers `/finances`
- [ ] L'icône de l'onglet Finances est une icône finance (pas un engrenage)
- [ ] L'onglet Finances est actif quand la route commence par `/finances`
- [ ] La page qui était derrière "Locations" fonctionne toujours (juste le label a changé)
- [ ] La page `/account` (Paramètres) fonctionne toujours (accessible via d'autres chemins)

### Agent 2 — Accès Paramètres
- [ ] Le proprio peut accéder à `/account` (Paramètres) depuis un avatar/profil/icône en haut de l'écran
- [ ] Cet accès est visible sur mobile ET desktop
- [ ] Cet accès est visible sur toutes les pages (pas juste le dashboard)
- [ ] Le tap navigue bien vers `/account`

### Agent 3 — Nettoyage Paramètres
- [ ] La section "GESTION LOCATIVE" est retirée de la sidebar Mon Compte
- [ ] Les 7 items (Finances, Récap fiscal, Quittances, Rappels légaux, Simulateur fiscal, Simulateur investissement, Mes simulations) ne sont plus dans la sidebar
- [ ] Les sections "MON COMPTE" et "PRÉFÉRENCES" sont inchangées
- [ ] "Aide & contact" est toujours présent
- [ ] Les pages retirées de la sidebar sont TOUJOURS accessibles via leur URL directe
- [ ] Aucune page n'a été supprimée
- [ ] Aucune route n'a été supprimée

### Global
- [ ] `npm run build` → 0 erreurs
- [ ] Navigation mobile : 5 onglets (Agenda, Annonces, Activités, Messages, Finances)
- [ ] Toutes les pages existantes fonctionnent toujours
- [ ] Les deep links existants (depuis le dashboard, depuis les emails, etc.) fonctionnent toujours
