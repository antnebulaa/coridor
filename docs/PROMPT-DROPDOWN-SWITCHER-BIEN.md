# Dropdown Switcher de Bien — Page Dépenses & Charges

## ⚠️ SCOPE STRICT

Ce prompt concerne **UNIQUEMENT** la transformation du bandeau contextuel du bien en dropdown switcher sur la page Dépenses & Charges.

**NE PAS TOUCHER :**
- La page `/finances` (`components/finances/`, `app/[locale]/finances/`)
- Le dashboard (`components/dashboard/`)
- Les filtres, les KPIs, la liste de dépenses, le formulaire d'ajout
- Le widget "À venir"
- La répartition des charges
- Tout autre composant de cette page

**La seule chose qui change :** le bandeau contextuel du bien devient un dropdown pour switcher entre les biens.

---

## Contexte

Le bandeau contextuel affiche actuellement le nom du bien + adresse avec un chevron ›. On le transforme en **dropdown sélecteur** : tap → ouvre la liste des biens du proprio → tap sur un autre bien → les données de la page se rechargent (dépenses, répartition, "À venir", filtres) sans changer de page.

Un prototype React interactif a été validé : `dropdown-explorations.jsx` (design 02 — Glass Morphism). S'en servir comme **référence visuelle** pour le dropdown.

**Ce dropdown existe UNIQUEMENT sur la page Dépenses & Charges.** Sur les autres sections de l'onglet Location (Bail, Loyer, EDL, etc.), le bandeau reste un simple affichage statique non cliquable (le contexte bien est lié à l'URL sur ces pages).

**Convention :** ce prompt utilise les team agents (sub-agents) pour l'exécution parallèle.

---

## ORGANISATION EN TEAM AGENTS

### Agent 1 — Composant PropertySwitcher (UI)

**Mission :** Créer le composant dropdown. Trigger, panel, animations, design premium.

### Agent 2 — Backend + Intégration données

**Mission :** Charger la liste des biens du proprio avec mini-stats. Recharger les données de la page quand on switch de bien.

---

## AGENT 1 — COMPOSANT PROPERTYSWITCHER

### Trigger (état fermé)

Le bandeau existant :
```
┌──────────────────────────────────────────────────────┐
│  🏠  Appartement Lumineux                        ▼   │
│      17 Rue Jules Guesde, Levallois                  │
└──────────────────────────────────────────────────────┘
```

- Remplacer le chevron › par un chevron ▼ (indique que c'est un dropdown)
- `cursor: pointer` sur tout le bandeau
- Le design existant (fond copperBg, border copperLight, rounded-xl) est conservé

### Trigger (état ouvert)

Quand le dropdown est ouvert, le trigger change :
- Le border passe en `border-copper` avec `rgba(168,130,94,0.4)` (plus marqué)
- Le border-radius reste `rounded-2xl` (le panel flotte en dessous, pas collé)
- Le fond passe en `rgba(255,255,255,0.85)` avec `backdrop-filter: blur(20px) saturate(1.2)`
- Le chevron ▼ tourne à 180° (animation `transform: rotate(180deg)`, transition 300ms `cubic-bezier(0.34, 1.56, 0.64, 1)` — léger bounce)
- Ombre : `box-shadow: 0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)`

### Panel dropdown — Glass Morphism

Le panel **flotte** sous le trigger avec un gap de 8px (pas collé) :

```
┌──────────────────────────────────────────────────────┐
│  🏠  Appartement Lumineux                        ▲   │  ← trigger
│      17 Rue Jules Guesde, Levallois                  │
└──────────────────────────────────────────────────────┘
        ↕ 8px gap
┌──────────────────────────────────────────────────────┐
│  VOS BIENS                                           │
│                                                      │
│  ✓  Appartement Lumineux                   2 581€   │  ← gradient actif
│     17 Rue Jules Guesde, Levallois        38 dép.   │
│                                                      │
│  🏢  Studio Rivoli                         1 840€   │
│     45 Rue de Rivoli, Paris 4ème          24 dép.   │
│                                                      │
│  🏡  T3 Bastille                           3 200€   │
│     12 Rue de la Roquette, Paris 11ème    42 dép.   │
│                                                      │
│              + Ajouter un bien                       │
└──────────────────────────────────────────────────────┘
```

**Specs Glass Morphism du panel :**
- `position: absolute`, `top: calc(100% + 8px)`, `left: 0`, `right: 0`
- Fond : `background: rgba(255,255,255,0.82)` — **translucide, pas opaque**
- `backdrop-filter: blur(24px) saturate(1.3)` + `-webkit-backdrop-filter` (support Safari)
- `border: 1px solid rgba(168,130,94,0.3)` — bordure cuivre subtile
- `border-radius: 16px` — arrondi complet (le panel flotte)
- `box-shadow: 0 16px 48px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)` — ombre douce + reflet intérieur en haut
- `z-index: 100`
- Animation d'ouverture : `opacity 0→1 + translateY(-4px)→0` en 250ms `cubic-bezier(0.16, 1, 0.3, 1)`

**Label "VOS BIENS" :**
- `text-[9px] font-bold text-ink4 uppercase tracking-[1.2px]`
- `padding: 10px 16px 6px`

**Chaque ligne de bien :**
- Padding : `11px 16px`
- `border-bottom: 1px solid rgba(0,0,0,0.04)` (très subtil)
- Layout : icône 34×34 → nom + adresse → montant + count
- Animation stagger : chaque item apparaît avec `translateY(4px)→0` + fade, délai `i * 0.04s`
- Hover (desktop) : `background: rgba(168,130,94,0.05)` — teinte cuivre très légère
- `cursor: pointer`

**Bien actif — gradient line :**
- `background: linear-gradient(90deg, rgba(168,130,94,0.12) 0%, transparent 100%)` — dégradé cuivre de gauche à droite qui disparaît
- Nom en `font-semibold`
- Montant en couleur `copper`

**Icône du bien :**
- Bien actif : rond 34×34, `background: linear-gradient(135deg, copper 0%, copperDark 100%)`, SVG check blanc (pas emoji ✓ texte), `box-shadow: 0 2px 8px rgba(168,130,94,0.25)` — ombre dorée
- Autres biens : rond 34×34, `background: rgba(255,255,255,0.6)`, `border: 1px solid rgba(0,0,0,0.06)`, emoji centré

**Nom + adresse :**
- Nom : `text-xs` — actif `font-semibold text-ink`, inactif `font-medium text-ink2`
- Adresse : `text-[9px] text-ink4`

**Mini-stats à droite :**
- Total dépenses : `text-[13px] font-bold tabular-nums` — actif `text-copper`, inactif `text-ink2`
- Count : `text-[8px] text-ink4` → "38 dépenses"

**Footer "Ajouter un bien" :**
- `border-top: 1px solid rgba(0,0,0,0.05)`
- `padding: 10px 16px`, centré
- Texte : `text-[11px] text-copper font-medium`
- Icône "+" devant

### Backdrop

Quand le dropdown est ouvert :
- Backdrop `position: fixed`, `inset: 0`, `z-index: 99`
- `background: rgba(0,0,0,0.12)` — un peu plus marqué que d'habitude
- `backdrop-filter: blur(3px)` — léger flou sur la page derrière, renforce l'effet glass
- Animation : `opacity 0→1` en 200ms
- Tap sur le backdrop → ferme le dropdown

### Fermeture

Le dropdown se ferme quand :
- On tap sur un bien (après le switch)
- On tap sur le backdrop
- On tap sur le trigger (toggle)
- On clique en dehors (desktop — `mousedown` outside listener)

### Mobile vs Desktop

- **Mobile :** le panel s'ouvre en dropdown sous le trigger (comme décrit). Le backdrop gère la fermeture au tap.
- **Desktop :** même comportement. Le panel peut être légèrement plus large si le contenu le permet, mais reste attaché au trigger.
- **Si le proprio n'a qu'un seul bien :** le bandeau reste un affichage statique, PAS de chevron ▼, PAS de dropdown. Juste le bandeau contextuel simple.

---

## AGENT 2 — BACKEND + INTÉGRATION

### Données nécessaires

Pour le dropdown, il faut charger la liste des biens du proprio avec des mini-stats :

```typescript
interface PropertySwitcherItem {
  id: string;
  title: string;          // property.title
  street: string;         // property.street
  city: string;           // property.city
  totalExpenses: number;  // somme des dépenses de l'année sélectionnée
  expenseCount: number;   // nombre de dépenses de l'année sélectionnée
}
```

**Requête :** récupérer tous les biens du proprio avec un `_count` et une somme agrégée des dépenses pour l'année en cours. Utiliser les requêtes Prisma existantes — ne pas créer un nouvel endpoint si possible. Ajouter cette donnée dans la server action qui alimente déjà la page.

### Switch de bien

Quand le proprio sélectionne un autre bien :

1. Mettre à jour l'état local (propriété active)
2. Recharger les données de la page pour ce bien :
   - Les dépenses (liste)
   - Le résumé (total, récup, non récup, déductible)
   - La répartition par catégorie
   - Le widget "À venir"
3. **Option A (recommandée) :** changer l'URL avec `router.push` vers `/properties/{newPropertyId}/edit/expenses` — la page se recharge avec les bonnes données
4. **Option B :** SWR/revalidation côté client sans changement d'URL — plus fluide mais plus complexe

Choisir l'option la plus simple et la plus cohérente avec l'architecture existante de la page.

### Cas un seul bien

Si le proprio n'a qu'un seul bien (`properties.length === 1`), ne PAS afficher le dropdown. Afficher le bandeau statique existant (sans chevron, non cliquable).

---

## VÉRIFICATIONS

### Agent 1
- [ ] Le bandeau existant est transformé en dropdown cliquable
- [ ] Le chevron ▼ tourne à 180° quand ouvert
- [ ] Le trigger change de style quand ouvert (border copper, radius top only, fond blanc)
- [ ] Le panel s'ouvre sous le trigger sans gap
- [ ] Chaque bien affiche : emoji/check + nom + adresse + total dépenses + count
- [ ] Le bien actif a un check ✓ cuivre au lieu de l'emoji
- [ ] Animation stagger sur les items
- [ ] Backdrop ferme le dropdown
- [ ] Click outside ferme le dropdown (desktop)
- [ ] Si un seul bien → pas de dropdown, bandeau statique
- [ ] Lien "+ Ajouter un bien" en footer
- [ ] **Aucun autre composant de la page n'a été modifié**

### Agent 2
- [ ] La liste des biens avec mini-stats est chargée
- [ ] Le switch de bien recharge les données correctement
- [ ] L'URL ou l'état reflète le bien actif
- [ ] Le total dépenses et le count sont corrects pour chaque bien
- [ ] Pas de régression sur le chargement initial de la page
- [ ] **Aucun fichier dans `components/finances/` ou `app/[locale]/finances/` modifié**

### Global
- [ ] `npm run build` → 0 erreurs
- [ ] La page Dépenses & Charges fonctionne correctement après switch
- [ ] Mobile 375px : le dropdown ne déborde pas
- [ ] Desktop : le dropdown est correctement positionné
