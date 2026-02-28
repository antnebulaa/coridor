# Simulateur d'investissement locatif — V2.2 : Design & UX Polish

## Contexte

La V2 a enrichi le moteur (12 régimes, formulaire complet). La V2.1 a restructuré les résultats (3 cartes, verdict, 5 onglets, section expert). L'ensemble est **fonctionnellement excellent** mais **visuellement générique** — c'est du bon dev, pas du bon design.

Cette V2.2 est un sprint 100% UI/UX. Aucun changement au moteur de calcul. On transforme un formulaire SaaS blanc/gris en une **expérience mémorable** qui donne envie de s'inscrire et de partager.

## Prérequis

V2 et V2.1 terminées et fonctionnelles. Ce sprint modifie uniquement les composants d'affichage, les styles, et les animations.

## Fichiers à lire avant de coder

- `app/[locale]/simulateur/SimulatorClient.tsx`
- `app/[locale]/simulateur/layout.tsx`
- `components/simulator/*` (tous les composants V2.1)
- `tailwind.config.ts` (palette, fonts, breakpoints existants)
- `app/globals.css` ou équivalent

⚠️ NE PAS modifier le moteur de calcul (InvestmentSimulatorService.ts).
⚠️ NE PAS changer la logique métier des composants. Uniquement le rendu visuel.

---

## Direction artistique

**Ton :** Refined premium — pas luxe froid, mais chaleureux et expert. L'utilisateur doit sentir qu'il utilise un outil professionnel qui prend soin de lui.

**Palette Coridor :**
```css
:root {
  /* Fond */
  --bg-warm: #FAF9F6;          /* Off-white chaud — JAMAIS du blanc pur */
  --bg-card: #FFFFFF;           /* Cartes sur fond chaud */
  --bg-section: #F5F3EE;       /* Sections regroupées */

  /* Accent principal — Ambre/Cuivre Coridor */
  --amber-50: #FFF8E7;
  --amber-100: #FFEFC2;
  --amber-400: #E8A838;
  --amber-500: #D4922A;
  --amber-600: #B87A1E;
  --amber-gradient: linear-gradient(135deg, #E8A838 0%, #D4922A 50%, #B87A1E 100%);

  /* Sémantique */
  --success: #16A34A;           /* Vert franc — enrichissement, gain */
  --success-bg: #F0FDF4;
  --warning: #D97706;           /* Ambre — correct, attention douce */
  --warning-bg: #FFFBEB;
  --danger: #DC2626;            /* Rouge — UNIQUEMENT vrais signaux d'alerte */
  --danger-bg: #FEF2F2;
  --info: #2563EB;              /* Bleu — défiscalisation */
  --info-bg: #EFF6FF;
  --effort: #78716C;            /* Gris chaud — effort d'épargne (PAS rouge) */
  --effort-bg: #F5F5F4;        /* Un cash-flow négatif n'est pas un danger, */
                                 /* c'est un effort. Le rouge effraie inutilement. */

  /* Texte */
  --text-primary: #1A1A1A;
  --text-secondary: #6B7280;
  --text-muted: #9CA3AF;

  /* Ombres */
  --shadow-card: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03);
  --shadow-card-hover: 0 4px 16px rgba(0,0,0,0.08);
  --shadow-elevated: 0 8px 30px rgba(0,0,0,0.08);
}
```

**Typographie :**
- Titres / questions : **DM Serif Display** (serif élégant, Google Fonts gratuit) ou **Playfair Display** — donne de la personnalité, se distingue du tout-sans-serif SaaS
- Corps / données : **DM Sans** ou **Plus Jakarta Sans** — lisible, moderne, bonne paire avec DM Serif
- Chiffres / KPIs : **Tabular figures** (font-variant-numeric: tabular-nums) — les colonnes de chiffres s'alignent proprement
- Importer via `next/font/google` (pas de CDN, pas de FOUC)

```typescript
// app/[locale]/simulateur/layout.tsx
import { DM_Serif_Display, DM_Sans } from 'next/font/google';

const serifFont = DM_Serif_Display({ subsets: ['latin'], weight: '400', variable: '--font-serif' });
const sansFont = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-sans' });
```

---

## 1. Page wrapper et atmosphère globale

### 1.1 Fond chaud et texture subtile

Remplacer le fond blanc par le off-white chaud (#FAF9F6). Ajouter une texture noise très légère (opacity 0.02-0.03) pour donner de la profondeur sans distraire.

```css
.simulator-page {
  background-color: var(--bg-warm);
  background-image: url("data:image/svg+xml,..."); /* noise SVG inline */
  min-height: 100vh;
}
```

### 1.2 Header de page avec gradient

En haut de la page simulateur, un header avec gradient ambre subtil :

```
┌──────────────────────────────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░ gradient ambre doux ░░░░░░░░░░░░░░░░░░░░  │
│                                                                  │
│     Simulateur d'investissement locatif                         │
│     Analysez la rentabilité de votre projet en 4 étapes         │
│                                                                  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
└──────────────────────────────────────────────────────────────────┘
```

Le titre utilise la font serif. Le sous-titre utilise la font sans en text-secondary. Le gradient va de amber-50 à transparent (fade vers le fond chaud).

---

## 2. Stepper formulaire — "Story bar"

### 2.1 Refonte du stepper

Remplacer les pills plates par un stepper connecté avec progression visuelle :

```
  ① Le bien ──────── ② Financement ──────── ③ Location ──────── ④ Fiscalité
  ✓ T2 70m²          ● En cours              ○                    ○
    200k€ meublé
```

**Design :**
- Cercles numérotés (pas juste des pills)
- Ligne de connexion entre les étapes — remplie en ambre jusqu'à l'étape courante, grise après
- Étape complétée : cercle ambre avec check blanc, mini-résumé en dessous en text-muted
- Étape courante : cercle ambre pulsant légèrement (animation pulse 2s)
- Étape future : cercle gris clair, label gris

**Le mini-résumé se construit progressivement :**
- Après étape 1 : "T2 70m² · 200 000€ · Meublé"
- Après étape 2 : "+ prêt 20 ans · 3,5% · apport 40k€"
- Après étape 3 : "+ loyer 1 500€ HC · vacance 2 mois"

Cela crée un **investissement émotionnel** — l'utilisateur voit son projet prendre forme et ne veut pas abandonner à mi-chemin (effet IKEA / sunk cost positif).

### 2.2 Composant StoryBar.tsx

```typescript
interface StoryBarProps {
  currentStep: number; // 0-3
  completedSteps: { step: number; summary: string }[];
}
```

Animation : quand l'utilisateur passe à l'étape suivante, la ligne se remplit avec une animation ease-out 400ms, le cercle se colore, le résumé fade-in.

---

## 3. Formulaire — Refinement des étapes

### 3.1 Titres en questions engageantes (serif)

Remplacer les titres factuels par des questions conversationnelles en DM Serif Display :

| Actuel | Nouveau |
|---|---|
| "Votre projet" | "Quel bien avez-vous repéré ?" |
| "Financement" | "Comment financez-vous ?" |
| "Location" | "Combien allez-vous louer ?" |
| "Fiscalité & Projection" | "Quelle fiscalité appliquer ?" |

Font : `font-serif text-2xl md:text-3xl text-primary`

### 3.2 Layout 2 colonnes pour champs courts

Sur desktop (md+), regrouper les champs qui vont naturellement ensemble :

**Étape Bien :**
```
[Prix d'achat ···················€]  ← pleine largeur

[Ancien (~8%) | Neuf (~3%)]  [Appartement | Maison]  ← 2 cols

[Surface ·········m²]  [Travaux ·········€]  ← 2 cols

[Nu | Meublé]  [Ameublement ·····€]  ← 2 cols (si meublé)
```

**Étape Financement :**
```
[Apport : 0€ | Notaire | 10% | 20%]  ← pleine largeur
[40 000 ··························€]  ← pleine largeur

[Durée ·· 20 ans ▾]  [Taux ····3,5 %]  ← 2 cols

[Assurance emprunteur ·····0,34 %]    ← pleine largeur
```

**Étape Location :**
```
[Loyer HC ···········€/mois]  [Charges récup ···€/mois]  ← 2 cols

[Taxe foncière ·················€/an]  ← pleine largeur

[Vacance : 0 | 1 sem | 2 sem | 1 mois | 2 mois]  ← pleine largeur

[Autogestion (0%) | Agence (~8%)]  ← pleine largeur
```

### 3.3 Pill buttons améliorés

Les pill toggles (Ancien/Neuf, etc.) sont bons mais trop contrastés (noir/blanc). Adoucir :

- **Sélectionné :** fond ambre-500, texte blanc, border-radius: 9999px, shadow-sm
- **Non sélectionné :** fond transparent, border 1.5px gris-300, texte gris-700, hover: border ambre-300
- **Transition :** background 200ms ease, scale 1.02 au clic

### 3.4 Inputs stylés

Les inputs actuels sont propres mais génériques. Affiner :

```css
.input-field {
  background: var(--bg-card);
  border: 1.5px solid #E5E7EB;
  border-radius: 12px;
  padding: 14px 16px;
  font-size: 16px;
  font-variant-numeric: tabular-nums;
  transition: border-color 200ms, box-shadow 200ms;
}
.input-field:focus {
  border-color: var(--amber-400);
  box-shadow: 0 0 0 3px rgba(232, 168, 56, 0.12);
  outline: none;
}
```

**Suffixes (€, %, m², €/mois) :** actuellement à droite dans l'input en gris. Bien. Mais les mettre dans un container séparé avec un fond légèrement teinté (bg-section) pour mieux les distinguer du contenu saisi.

### 3.5 Section "Options avancées" améliorée

Actuellement un simple chevron + texte. Transformer en :

```
────────────────────────────────────────
  ⚙  Options avancées                ▾
────────────────────────────────────────
```

- Ligne de séparation au-dessus
- Icône engrenage (Lucide `Settings2`)
- Animation d'ouverture : height auto avec transition (framer-motion `AnimatePresence` ou CSS max-height trick)
- Quand ouvert, les champs apparaissent dans un container avec fond bg-section et border-radius 12px

### 3.6 Résumé crédit live (étape Financement)

Le résumé en bas "Montant emprunté / Mensualité / Coût total" est excellent. L'améliorer :

```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
  Résumé de votre crédit
  
  Montant emprunté     193 287€
  Mensualité estimée     1 121€  /mois
  Coût total du crédit  75 750€
  
  Les valeurs se mettent à jour en temps réel
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

- Fond bg-section, border dashed subtle
- Les chiffres s'animent quand ils changent (countUp ou transition CSS)
- Label "Mensualité" en gras si elle dépasse 33% des revenus (signal d'alerte taux d'endettement)

### 3.7 Teasing flou pendant la saisie

Pendant que l'utilisateur remplit le formulaire, afficher un **aperçu flouté** en bas de la carte formulaire qui se met à jour en temps réel au fur et à mesure qu'il saisit des données :

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  [... champs du formulaire ...]                                  │
│                                                                  │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                  │
│  ░░  Patrimoine estimé en 20 ans              ░░                │
│  ░░           ≈ 244 000€                      ░░                │
│  ░░  (finalisez la simulation pour le détail) ░░                │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Implémentation :**
- Un composant `TeasingPreview.tsx` en bas du formulaire
- Fait un calcul simplifié côté client (pas d'appel API) avec les données déjà saisies
- Affiche un gros chiffre arrondi avec un filtre `blur(6px)` CSS
- Le flou diminue progressivement à chaque étape complétée (blur 6px → 4px → 2px → 0px au clic "Simuler")
- Le chiffre bouge quand l'utilisateur change un input (avec debounce 300ms) — ça crée de la curiosité et de l'engagement
- Texte "Finalisez la simulation pour le détail" en text-muted sous le chiffre

Ça exploite l'**effet Zeigarnik** (les tâches incomplètes restent en mémoire) et la **curiosité** — l'utilisateur veut voir le vrai chiffre net.

### 3.8 Boutons navigation

Remplacer les boutons noirs uniformes :

- **"Suivant >"** : fond ambre-gradient, texte blanc, rounded-full, px-8 py-3, shadow-md, hover: shadow-lg + translate-y -1px
- **"< Retour"** : ghost button, texte gris-600, pas de fond, hover: texte ambre-500
- **"Simuler 📊"** : plus grand que les autres, ambre-gradient, icon Chart, pulse subtil pour attirer l'attention

---

## 4. Transition formulaire → résultats (le moment clé)

### 4.1 Animation de calcul

Quand l'utilisateur clique "Simuler", ne PAS afficher les résultats immédiatement. Montrer une séquence de 1.5-2 secondes :

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                    [icône maison animée]                         │
│                                                                  │
│              Analyse de votre investissement...                  │
│                                                                  │
│        ████████████████████░░░░░░░░░░  67%                      │
│                                                                  │
│        ✓ Calcul des rendements                                  │
│        ✓ Comparaison des régimes fiscaux                        │
│        ● Projection sur 20 ans...                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Étapes affichées progressivement (stagger 400ms) :**
1. "Calcul des rendements" → check
2. "Comparaison des régimes fiscaux" → check
3. "Projection sur 20 ans" → check
4. "Analyse terminée !" → transition vers les résultats

**Techniquement :** Le calcul API est quasi-instantané (<100ms). L'animation est purement cosmétique mais crée une valeur perçue énorme. Utiliser setTimeout + setState pour les étapes.

### 4.2 Reveal des résultats

Après l'animation de calcul, les résultats apparaissent avec un stagger :

1. **Verdict** : fade-in + scale de 0.95 à 1 (300ms)
2. **3 cartes résumé** : slide-up + fade-in, décalage 100ms entre chaque carte
3. **Onglets** : fade-in (200ms)

Utiliser CSS @keyframes ou framer-motion si disponible :

```css
@keyframes slideUpFade {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.result-card { animation: slideUpFade 500ms ease-out forwards; }
.result-card:nth-child(1) { animation-delay: 100ms; }
.result-card:nth-child(2) { animation-delay: 200ms; }
.result-card:nth-child(3) { animation-delay: 300ms; }
```

---

## 5. Verdict — Le moment émotionnel ("Master Headline")

### 5.1 La promesse personnelle AVANT le badge technique

Le premier élément visible n'est PAS un badge "INVESTISSEMENT RENTABLE" (froid, administratif). C'est une **phrase émotionnelle personnalisée** qui projette l'utilisateur dans le futur :

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│       En 2046, cet investissement vous aura                     │
│              enrichi de 244 038€.                               │
│                                                                  │
│              ✅ Investissement rentable                          │
│       Rendement 4,64% · Régime recommandé : LMNP réel          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**La phrase principale :**
- Font-serif, text-3xl md:text-4xl, text-primary, text-center
- Le montant en couleur ambre-500, font-bold
- L'année = année courante + projectionYears
- Générée dynamiquement :
  - Si patrimoine positif : "En {année}, cet investissement vous aura enrichi de {patrimoine}€."
  - Si patrimoine négatif : "Attention : cet investissement nécessite une analyse approfondie."
  - Si défiscalisation forte : "En {année}, vous aurez économisé {reduction}€ d'impôts."

**Le badge technique :**
- SOUS la phrase, plus petit (text-sm), en badge pill
- ✅ Rentable (vert) / ⚠️ Correct (ambre) / ❌ Faible (rouge) / 💎 Défiscalisant (bleu)
- + une ligne de détail en text-muted

### 5.2 Animation du verdict

L'ensemble apparaît avec un stagger :
1. La phrase fade-in + slide-up (400ms)
2. Le montant countUp de 0 à la valeur (800ms)
3. Le badge pill scale-in (200ms, delay 600ms)

Icône check animée SVG (stroke-dashoffset) à côté du badge — 600ms :

```css
.check-circle { stroke-dasharray: 166; stroke-dashoffset: 166; animation: drawCheck 600ms ease forwards 200ms; }
.check-mark { stroke-dasharray: 50; stroke-dashoffset: 50; animation: drawCheck 300ms ease forwards 600ms; }
@keyframes drawCheck { to { stroke-dashoffset: 0; } }
```

### 5.2 Animation du check

L'icône check se dessine en SVG animé (stroke-dashoffset) — 600ms. C'est le micro-moment de satisfaction. Libs existantes : rien de nécessaire, c'est du CSS pur :

```css
.check-circle { stroke-dasharray: 166; stroke-dashoffset: 166; animation: drawCheck 600ms ease forwards 200ms; }
.check-mark { stroke-dasharray: 50; stroke-dashoffset: 50; animation: drawCheck 300ms ease forwards 600ms; }
@keyframes drawCheck { to { stroke-dashoffset: 0; } }
```

---

## 6. Cartes résumé — Personnalité et hiérarchie

### 6.1 Refonte EssentialSummary.tsx

Les 3 cartes actuelles sont fonctionnelles mais plates. Ajouter de la personnalité :

**Chaque carte :**
- Fond : bg-card
- Ombre : shadow-card, hover: shadow-card-hover + translateY(-2px) transition 200ms
- Border-radius : 16px
- Bordure gauche colorée : 4px (la couleur dépend de la valeur — vert/ambre/rouge)
- Icône en haut à gauche : 40x40px, fond teinté (success-bg, warning-bg, danger-bg), border-radius 12px
- Titre : font-serif, text-lg
- Données : font-sans, tabular-nums, les chiffres importants en text-xl bold
- "Voir détail ▼" : text-amber-500, hover: underline, cursor-pointer

**Coloration dynamique de la bordure gauche :**
- Carte Coût : vert si effort < 50€, ambre si 50-200€, rouge si > 200€
- Carte Rentabilité : vert si > 5%, ambre si 3-5%, rouge si < 3%
- Carte Fiscalité : rouge si hausse, vert si baisse (Pinel/déficit)

### 6.2 Chiffres animés (countUp)

Les montants dans les cartes s'animent de 0 à la valeur finale quand ils apparaissent (durée 800ms, ease-out). Pas de librairie nécessaire — un simple hook useCountUp :

```typescript
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return value;
}
```

---

## 7. Navigation résultats — Scroll narratif avec nav sticky

### 7.1 Principe : scroll > onglets

Les onglets cachent l'histoire et forcent l'utilisateur à cliquer. À la place, toutes les sections sont sur une **seule page scrollable** qui raconte une histoire de haut en bas :

1. **La promesse** (verdict + patrimoine) — "voici ce que ça donne"
2. **Le quotidien** (coût mensuel) — "voici votre effort"
3. **La croissance** (rentabilité + graphique) — "voici comment ça grandit"
4. **L'optimisation** (fiscalité) — "voici comment réduire l'impact"
5. **La mécanique** (emprunt) — "voici comment c'est financé"
6. **La sortie** (revente) — "voici ce que vous récupérez"
7. **L'expert** (tableaux détaillés) — "pour aller plus loin"

### 7.2 Navigation sticky avec scroll-spy

Les onglets deviennent une **nav sticky** en haut de la zone résultats. Quand l'utilisateur scrolle, l'onglet actif suit la section visible (IntersectionObserver).

```
┌──────────────────────────────────────────────────────────────────┐
│  💰 Coût   📈 Rentabilité   📋 Fiscalité   🏦 Emprunt   🏠 Revente │
│  ══════════                                                      │
│  (sticky top, scroll-spy, clic = smooth scroll vers la section)  │
└──────────────────────────────────────────────────────────────────┘
```

**Design de la nav sticky :**
- Fond bg-card avec shadow-sm en bas (quand stickée)
- Position sticky top-0, z-50
- Apparaît uniquement quand l'utilisateur commence à scroller dans les résultats
- Tab active : fond ambre-50, text-ambre-700, font-medium, border-bottom 2px ambre
- Tab inactive : text-secondary, hover text-primary
- Animation : l'indicateur slide horizontalement (transition 300ms)
- Clic sur un onglet = `scrollIntoView({ behavior: 'smooth' })` vers la section

### 7.3 Séparateurs entre sections

Chaque section est visuellement distincte avec un espacement généreux (py-12 md:py-16) et un titre en question (font-serif). Entre les sections, un séparateur subtil :

```css
.result-section + .result-section {
  border-top: 1px solid #E5E7EB;
  margin-top: 3rem;
  padding-top: 3rem;
}
```

### 7.4 Animations au scroll (fade-up)

Chaque section apparaît avec une animation fade-up quand elle entre dans le viewport (IntersectionObserver + CSS class toggle) :

```css
.scroll-reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 600ms ease, transform 600ms ease;
}
.scroll-reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
```

Pas de librairie nécessaire — IntersectionObserver + toggle de classe CSS. Threshold à 0.15 (se déclenche quand 15% de la section est visible).

---

## 8. Onglet Coût — Waterfall chart

### 8.1 Remplacer les 2 colonnes par un waterfall

Les 2 colonnes (Revenus / Dépenses) sont déséquilibrées. Les remplacer par une **visualisation en cascade** plus intuitive :

```
Loyer HC                    ████████████████████████  1 500€
Vacance locative            ████████████████████▌     -231€
                            ─────────────────────
Net après vacance           ███████████████████       1 269€

Mensualité crédit                          ████████   -1 121€
Assurance prêt                                ██      -55€
Taxe foncière                                █▌       -83€
Assurance PNO                                 ▎       -13€
Copropriété                                  █        -50€
Entretien                                     ▌       -25€
Impôts fonciers                              █▌       -87€
                            ─────────────────────
EFFORT MENSUEL                                        -165€/mois
```

**Implémentation :** Recharts BarChart horizontal ou composant custom :
- Barre verte pour le loyer (point de départ)
- Barres rouges qui grignotent depuis la droite (chaque charge)
- Résultat final : barre ambre si positif, rouge si négatif
- Tooltip au hover de chaque barre : nom + montant + % du loyer
- Labels à gauche (noms), valeurs à droite

### 8.2 Alternative mobile

Sur mobile (< md), le waterfall est trop large. Basculer sur les 2 colonnes empilées (version actuelle) mais avec les améliorations visuelles (icônes, couleurs, espacement).

### 8.3 Effort d'épargne — Mise en scène

Le bloc "Effort d'épargne mensuel" est le chiffre clé. Le mettre en scène :

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│    Votre effort d'épargne mensuel                               │
│                                                                  │
│              -165€ /mois                                         │
│              ═══════════                                         │
│              Soit 1 980€ par an                                  │
│                                                                  │
│    💡 Astuce : en passant à 25 ans, votre effort                │
│       descend à -42€/mois. → Voir onglet Emprunt               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

- Montant : font-serif, text-4xl (gros !), couleur rouge si négatif, vert si positif
- Encadré avec fond danger-bg (rouge pâle) si négatif, success-bg si positif
- L'astuce est générée dynamiquement : si une durée d'emprunt plus longue réduit l'effort de > 50%, la mentionner
- Lien cliquable vers l'onglet Emprunt

---

## 9. Onglet Rentabilité — Graphique patrimoine

### 9.1 Graphique multi-courbes amélioré

Le graphique est déjà bon (4 courbes, tooltip). Affiner :

**Couleurs des courbes :**
- Valeur du bien : gris pointillés (c'est le référentiel, pas l'info principale)
- Capital restant dû : rouge-400, trait plein, area remplie rouge-50 à 0.3 opacity
- Cash-flow cumulé : vert si positif / rouge si négatif, trait plein
- Patrimoine net : ambre-500, trait épais (3px), area remplie ambre-50 — C'EST la courbe principale

**Tooltip enrichi :**
- Fond dark (gris-900), texte blanc, border-radius 12px, shadow-elevated
- Mini cercles colorés devant chaque valeur (comme la légende)
- Séparateur entre les valeurs
- Année en bold en haut

**Animation d'entrée :** Les courbes se dessinent de gauche à droite en 1s (CSS clip-path animation ou Recharts animationDuration).

### 9.2 Comparaison placements — Titre dynamique

Au-dessus des barres, un titre calculé :

```
💡 Votre investissement rapporte 2,1× plus que la Bourse
   et 7,5× plus que le Livret A sur 20 ans.
```

Le multiplicateur est calculé depuis les résultats. Font-serif pour le titre, les chiffres en bold ambre.

Les barres horizontales s'animent (grow from left) à l'entrée en viewport (IntersectionObserver).

Barre immobilier : gradient ambre. Bourse : bleu. Livret A : vert. Assurance-vie : violet. Chaque barre a un border-radius et une hauteur généreuse (40px).

---

## 10. Onglet Fiscalité — Side by side impactant

### 10.1 SANS vs AVEC

Les deux colonnes sont bien. Améliorer le contraste :

**Colonne "Sans investissement" :**
- Fond : bg-section (gris chaud)
- Style : sobre, les chiffres sont gris
- L'idée : "votre situation actuelle, plate"

**Colonne "Avec investissement" :**
- Fond : blanc avec bordure colorée (rouge si hausse, vert si baisse)
- Les chiffres en bold
- La ligne "Revenus fonciers" en ambre
- L'idée : "voici ce qui change"

### 10.2 Badge hausse/baisse

Le badge "Hausse des impôts : +1 045€/an" est crucial. Le rendre plus visible :

- Si hausse : fond danger-bg, icône TrendingUp rouge, border-left 4px rouge
- Si baisse (Pinel/déficit) : fond success-bg, icône TrendingDown vert, border-left 4px vert
- En dessous : "Soit +87€/mois (inclus dans le coût mensuel)" en text-muted

### 10.3 Tableau régimes — Mise en valeur du meilleur

Le badge "Optimal" sur le meilleur régime est bien. L'améliorer :

- Ligne du régime optimal : fond amber-50, texte amber-800, badge "★ Optimal" ambre
- Hover sur les autres lignes : bg-section
- Si un régime n'est pas applicable : ligne grisée avec tooltip "Non applicable car..."

---

## 11. Onglet Emprunt — Layout Horiz.io style

### 11.1 Deux cartes côte à côte

Exactement comme dans le screenshot Horiz.io mais avec l'identité Coridor :

**Carte "Investissement global" :**
- Fond bg-card, border subtle, border-radius 16px
- Chaque ligne avec label text-secondary et montant text-primary aligné à droite
- Sous-items (Garantie) indentés avec un trait vertical gris
- Total : séparateur + font-bold text-lg, couleur ambre

**Carte "Votre crédit" :**
- Fond : légèrement bleuté (bg-info très léger) pour se distinguer
- Mensualité en text-2xl bold (c'est l'info clé)
- Coût du prêt : séparateur + ventilation intérêts/assurance
- Les pourcentages entre parenthèses en text-muted

---

## 12. Onglet Revente — Bilan total

### 12.1 Plus-value avec couleur dynamique

Le chiffre "Plus-value nette" change de couleur selon le signe :
- Positif : text-success + icône TrendingUp
- Négatif : text-danger + icône TrendingDown (comme dans les screenshots)
- Font-serif pour le titre, text-2xl pour le montant

### 12.2 Bilan total — Le bloc noir

Le bloc "Bilan total de l'opération" sur fond sombre est EXCELLENT. C'est le plus bel élément de la page actuelle. Le garder mais affiner :

```
┌──────────────────────────────────────────────────────────────────┐
│  BILAN TOTAL DE L'OPÉRATION                    ← fond gris-900  │
│                                                                  │
│  Plus-value nette                      -5 076€  ← text rouge    │
│  Cash-flow cumulé (10 ans)            -20 148€  ← text rouge    │
│  Capital remboursé                    +79 925€  ← text vert     │
│  ─────────────────────────────────────────────                   │
│  GAIN NET TOTAL                       +54 701€  ← text-2xl      │
│                                                  ← text ambre    │
│  Pour un apport de 40 000€                                      │
│  Rendement total : +137%              ← text-xl ambre bold      │
└──────────────────────────────────────────────────────────────────┘
```

- Les lignes positives en vert, négatives en rouge
- Le gain net total en ambre doré, font-serif, très grand
- Le rendement total en % est LE chiffre à retenir — le mettre en valeur avec un fond ambre-500/white pill badge
- Ajouter une animation countUp sur le gain total

---

## 13. Section Expert — Tableau intelligent

### 13.1 Header dépliable amélioré

```
┌──────────────────────────────────────────────────────────────────┐
│  📊  Indicateurs avancés (investisseurs expérimentés)       ▾   │
└──────────────────────────────────────────────────────────────────┘
```

- Fond bg-section, border-radius 12px
- Au clic : smooth expand avec animation

### 13.2 Tableau avec heatmap

Le tableau de projection annuelle est un mur de chiffres. Ajouter un **gradient de couleur** sur les colonnes Cash-flow et Cumulé :

- Cash-flow négatif : fond rouge-50, texte rouge — intensité proportionnelle au montant
- Cash-flow positif : fond vert-50, texte vert
- La transition de rouge à vert est visible visuellement → l'utilisateur VOIT le point d'inflexion sans lire

**Mode condensé par défaut :** Afficher seulement les années 1, 5, 10, 15, 20 avec un bouton "Voir toutes les années" qui expand le tableau.

---

## 14. CTA inscription et partage — Paywall intelligent

### 14.1 Tableau expert flouté (si non connecté)

Au lieu de montrer tout le tableau puis proposer l'inscription en dessous, montrer les **3 premières lignes nettes + le reste flouté** avec un CTA par-dessus. C'est beaucoup plus efficace :

```
┌──────────────────────────────────────────────────────────────────┐
│  Projection annuelle détaillée                                   │
│                                                                  │
│  An  Loyer   Net    Crédit   Impôt   Cash   Cumulé  Patrimoine │
│  1   18000  13181   14109    1045   -1973   -1973    15508      │
│  2   18360  13444   14109    1312   -1977   -3950    24565      │
│  3   18727  13713   14109    1587   -1983   -5933    33892      │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░                                                          ░░  │
│  ░░    🔒 Débloquez l'analyse complète                       ░░  │
│  ░░                                                          ░░  │
│  ░░    Créez un compte gratuit pour :                        ░░  │
│  ░░    ✓ Projection détaillée sur 20 ans                    ░░  │
│  ░░    ✓ Export PDF pour votre banquier                      ░░  │
│  ░░    ✓ Sauvegarde et comparaison de simulations           ░░  │
│  ░░    ✓ Gestion locative complète avec Coridor             ░░  │
│  ░░                                                          ░░  │
│  ░░    [ Créer mon compte gratuit — 30 secondes ]            ░░  │
│  ░░                                                          ░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
└──────────────────────────────────────────────────────────────────┘
```

**Implémentation :**
- CSS `filter: blur(8px)` sur les lignes 4+ du tableau
- Overlay semi-transparent par-dessus la zone floutée
- CTA centré dans l'overlay avec fond bg-card, shadow-elevated, border-radius 16px
- Bouton ambre-gradient, rounded-full, shadow-md
- Au clic : ouvre le modal d'inscription (pas de redirection — l'utilisateur ne perd PAS sa simulation)
- Après inscription : le flou se retire avec une animation (transition blur 500ms)

### 14.2 Boutons Sauvegarder/PDF verrouillés

Si non connecté, les boutons "Sauvegarder" et "Exporter PDF" montrent un cadenas :

```
[🔒 Sauvegarder — Compte gratuit]  [🔒 Exporter PDF — Compte gratuit]
```

Au clic : ouvre le modal d'inscription (pas une redirection — l'utilisateur ne perd pas sa simulation).

### 14.3 Bandeau post-résultats complémentaire

Après la section Expert, un bandeau plus doux pour ceux qui ont scrollé tout en bas :

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Cette simulation vous a été utile ?                            │
│                                                                  │
│  Avec Coridor, gérez vos biens de A à Z :                      │
│  baux, quittances, paiements, états des lieux, rappels légaux.  │
│                                                                  │
│  [Découvrir Coridor — Gratuit]     [🔗 Partager cette simulation]│
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

- Fond : gradient subtil ambre-50 → transparent
- Ton conversationnel, pas vendeur
- Deux CTA : inscription + partage (shareToken existant)

---

## 15. Responsive mobile

### 15.1 Breakpoints clés

- **< 640px (mobile)** : formulaire full-width, pills en scroll horizontal si nécessaire, graphiques simplifiés
- **640-1024px (tablette)** : 2 colonnes mais plus serrées
- **> 1024px (desktop)** : layout complet

### 15.2 Adaptations mobiles spécifiques

- **StoryBar :** Remplacer par une barre de progression simple (4 dots + ligne) — pas de résumé texte
- **Cartes résumé :** Empilées verticalement, full-width
- **YearSlider :** Select dropdown natif (pas de cercles)
- **Onglets résultats :** Scroll horizontal (snap) ou accordéon vertical
- **Graphique patrimoine :** Largeur 100% avec scroll horizontal si nécessaire
- **Waterfall chart :** Retour aux 2 colonnes simples
- **Tableau expert :** Scroll horizontal avec première colonne sticky

### 15.3 Touch interactions

- Swipe entre onglets (si ça n'entre pas en conflit avec le scroll de la page)
- YearSlider : geste drag natif sur la range input

---

## 16. Micro-détails qui font la différence

### 16.1 Disclaimer en bas de page

Texte actuel : bon contenu. Améliorer le style :

```css
.disclaimer {
  font-size: 13px;
  color: var(--text-muted);
  border-top: 1px solid #E5E7EB;
  padding-top: 24px;
  margin-top: 48px;
  line-height: 1.6;
}
```

### 16.2 Scroll spy (optionnel, bonus)

Quand l'utilisateur scrolle dans les résultats, l'onglet actif dans la navigation suit la section visible. Utilise IntersectionObserver.

### 16.3 Format des nombres

S'assurer que tous les montants utilisent le format français :
- Séparateur de milliers : espace insécable (1 500€, pas 1500€)
- Décimales : virgule (3,5%, pas 3.5%)
- `Intl.NumberFormat('fr-FR')` partout

### 16.4 Skeleton loading

Si le calcul API prend plus de 200ms (rare mais possible), afficher des skeletons animés (pulse gris) aux emplacements des cartes et du verdict. Pas un spinner.

---

## Fichiers impactés

| Fichier | Modifications |
|---|---|
| `tailwind.config.ts` | Palette Coridor (amber, warm grays), fonts DM Serif/Sans |
| `app/[locale]/simulateur/layout.tsx` | Import fonts, fond chaud, header gradient |
| `app/[locale]/simulateur/SimulatorClient.tsx` | Animation calcul, stagger reveal, skeleton |
| `components/simulator/StoryBar.tsx` | **Refonte** du stepper (ou renommage de l'existant) |
| `components/simulator/SimulatorForm.tsx` | Layout 2 cols, pills améliorés, inputs stylés, titres serif |
| `components/simulator/VerdictBadge.tsx` | Check animé SVG, gradient fond, bordure colorée |
| `components/simulator/EssentialSummary.tsx` | Bordure gauche dynamique, countUp, hover card |
| `components/simulator/ResultTabs.tsx` | Tabs avec indicateur slide, transitions contenu |
| `components/simulator/CostTab.tsx` | Waterfall chart, bloc effort redesigné, astuce dynamique |
| `components/simulator/ProfitabilityTab.tsx` | Couleurs courbes, tooltip dark, titre dynamique placements |
| `components/simulator/FiscalImpactTab.tsx` | Contraste SANS/AVEC, badge hausse/baisse, heatmap régimes |
| `components/simulator/LoanTab.tsx` | Cards Horiz.io style, fond bleuté crédit |
| `components/simulator/ResaleTab.tsx` | Couleurs dynamiques PV, animation gain total |
| `components/simulator/ExpertSection.tsx` | Heatmap tableau, mode condensé, expand animation |
| `components/simulator/YearSlider.tsx` | Points réduits, style amélioré |
| `components/simulator/useCountUp.ts` | **Créer** — hook countUp réutilisable |
| `components/simulator/CalculationLoader.tsx` | **Créer** — animation de calcul |
| `components/simulator/SignupBanner.tsx` | **Créer** — CTA inscription post-résultats |
| `components/simulator/TeasingPreview.tsx` | **Créer** — aperçu flouté patrimoine pendant saisie |
| `components/simulator/PaywallOverlay.tsx` | **Créer** — overlay flou sur tableau expert si non connecté |
| `components/simulator/ScrollReveal.tsx` | **Créer** — wrapper IntersectionObserver pour fade-up au scroll |
| `app/globals.css` (ou module CSS) | Variables CSS Coridor, animations keyframes, noise texture |
| `messages/fr.json` + `messages/en.json` | Titres questions, astuce dynamique, CTA |

## Vérifications

- [ ] Fond chaud #FAF9F6, jamais de blanc pur sauf cartes
- [ ] Font serif sur les titres de sections et questions
- [ ] Tabular-nums sur tous les montants et pourcentages
- [ ] Animation de calcul visible (1.5-2s) avant les résultats
- [ ] Verdict apparaît AVANT les cartes avec check animé
- [ ] CountUp sur les chiffres des cartes résumé
- [ ] Onglet actif avec indicateur slide animé
- [ ] Waterfall chart fonctionnel sur desktop, fallback 2 cols mobile
- [ ] Heatmap rouge/vert sur le tableau expert
- [ ] CTA inscription visible si non connecté
- [ ] Tous les montants en format français (1 500€, 3,5%)
- [ ] Responsive mobile : pas de layout cassé, pas de scroll horizontal involontaire
- [ ] npm run build → 0 erreurs
- [ ] Lighthouse performance > 90 (pas de fonts bloquantes, images optimisées)
