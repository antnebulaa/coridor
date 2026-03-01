# Simulateur V2.3 — Redesign visuel radical

## Le problème

La V2.2 a ajouté de la couleur et du serif mais le squelette est resté le même. Le résultat fait "formulaire SaaS avec du maquillage" — PAS le niveau de design d'un Airbnb, Stripe ou Linear. 

Les problèmes fondamentaux :
1. **Composition monotone** — tout a la même largeur, le même espacement, le même rythme
2. **Pas de profondeur** — tout est plat, pas de layers, pas de backdrop, pas de glassmorphism
3. **Pas de variation** — chaque section est un copier-coller de la précédente avec des données différentes
4. **Les chiffres clés sont noyés** — l'effort mensuel, le rendement, le patrimoine ne "sautent" pas aux yeux
5. **Aucune illustration/visuel** — que du texte et des lignes

## Principes de ce sprint

**NE PAS modifier le moteur de calcul.**
**NE PAS changer les données affichées.**
**UNIQUEMENT repenser la composition visuelle et les composants de rendu.**

Ce sprint repose sur 5 principes :
1. **Variation de rythme** — alterner sections larges/compactes, claires/sombres, texte/visuel
2. **Héros visuels** — les chiffres importants sont GRANDS, contrastés, impossibles à rater
3. **Profondeur** — fonds dégradés, ombres portées, superpositions (glassmorphism léger)
4. **Illustrations abstraites** — formes géométriques SVG, pas des cliparts, pour ponctuer les sections
5. **Respiration** — beaucoup plus de whitespace entre les blocs, espacement asymétrique

---

## PARTIE A — LE FORMULAIRE

### A.1 Layout général du formulaire

Le formulaire occupe un container centré de max-w-2xl (672px). MAIS il est posé sur un fond qui respire :

```
┌────────────────────────────── full width ────────────────────────────────┐
│                                                                          │
│  ░░░░░░░░░░░░░░░░░░░ fond dégradé chaud ░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░                                                                  ░░  │
│  ░░              ┌──────── max-w-2xl ─────────┐                      ░░  │
│  ░░              │                             │                      ░░  │
│  ░░              │   [ StoryBar ]              │                      ░░  │
│  ░░              │                             │                      ░░  │
│  ░░              │   ┌─── card blanche ──────┐ │                      ░░  │
│  ░░              │   │                       │ │                      ░░  │
│  ░░              │   │  Quel bien avez-vous  │ │                      ░░  │
│  ░░              │   │  repéré ?             │ │                      ░░  │
│  ░░              │   │                       │ │                      ░░  │
│  ░░              │   │  [... champs ...]     │ │                      ░░  │
│  ░░              │   │                       │ │                      ░░  │
│  ░░              │   └───────────────────────┘ │                      ░░  │
│  ░░              │                             │                      ░░  │
│  ░░              │   [ TeasingPreview flouté ] │                      ░░  │
│  ░░              │                             │                      ░░  │
│  ░░              └─────────────────────────────┘                      ░░  │
│  ░░                                                                  ░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Le fond dégradé :**
```css
.simulator-form-wrapper {
  background: linear-gradient(180deg, 
    #FFF8E7 0%,          /* ambre très pâle en haut */
    #FAF9F6 30%,         /* transition vers off-white */
    #FAF9F6 100%         /* off-white constant */
  );
  min-height: 100vh;
  padding: 2rem 1rem;
}
```

**La card du formulaire :**
```css
.form-card {
  background: white;
  border-radius: 24px;           /* coins très arrondis — premium feel */
  box-shadow: 0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04);
  padding: 3rem 2.5rem;          /* padding généreux */
  /* Sur mobile : */
  /* padding: 2rem 1.25rem; border-radius: 20px; */
}
```

Le border-radius à 24px est un détail crucial. Les cards à 8-12px font "admin panel". Les cards à 24px font "app premium".

### A.2 StoryBar — plus compact et élégant

Le stepper actuel prend trop de place verticalement avec les résumés. Le rendre plus compact :

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   ①━━━━━━━━━②━━━━━━━━━③─────────④                          │
│   Le bien   Financement  Location   Fiscalité               │
│                                                              │
│   Maison 120m² · 0€ · Meublé → Prêt 20 ans · 3,5%         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Changements :**
- Les cercles sont plus petits (32px au lieu de 40px)
- La ligne de connexion est plus épaisse (3px) et utilise le gradient ambre
- Les résumés des étapes précédentes sont sur UNE SEULE LIGNE horizontale avec des flèches, pas empilés verticalement sous chaque cercle
- Sur mobile : juste les 4 dots + la ligne, pas de texte

### A.3 Titres avec illustration décorative

Chaque titre de section a une petite forme SVG décorative à côté — pas une illustration descriptive, une forme abstraite :

```
                    ◇
Quel bien avez-vous repéré ?
```

Concrètement : un petit SVG de 24x24px (losange, cercle, triangle) en ambre-300 positionné en absolute au-dessus du titre, légèrement décalé à gauche. C'est un détail subtil mais qui casse la monotonie du "titre + champs".

### A.4 Quick-select pills en mode "cards" (apport personnel)

L'apport personnel a 4 pills + un input. Le problème : quand 3 pills sur 4 sont actives (0€, 10%, 20%), ça donne l'impression que tout est sélectionné. 

Transformer en mini-cards sélectionnables :

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│    0 €      │ │   Notaire   │ │    10 %     │ │  ● 20 %     │
│  Aucun      │ │   16 000€   │ │   20 000€   │ │   40 000€   │ ← sélectionné
│  apport     │ │             │ │             │ │             │    (bordure ambre)
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

Chaque mini-card : 
- Non sélectionnée : bg-white, border 1.5px neutral-200, rounded-xl
- Sélectionnée : border 2px ambre-400, bg-amber-50, petit dot ambre en haut à droite
- Le montant calculé s'affiche en text-muted sous le pourcentage
- Grid 2×2 sur mobile, 4 cols sur desktop

### A.5 Le TeasingPreview — "glassmorphism"

Au lieu d'un simple texte flouté, le TeasingPreview utilise un style glassmorphism :

```css
.teasing-preview {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  padding: 2rem;
  text-align: center;
  margin-top: 1.5rem;
}
```

Le chiffre patrimoine est en font-serif, text-3xl, ambre-500. Il bouge en temps réel (debounced). Pas besoin du filter blur sur le texte — le glassmorphism donne déjà l'effet "derrière une vitre".

En dessous : "Cliquez sur Simuler pour voir l'analyse complète →"

---

## PARTIE B — LA TRANSITION

### B.1 Fullscreen overlay de calcul

La transition formulaire → résultats est un overlay fullscreen, pas un petit loader in-page :

```
┌────────────────────────── plein écran ──────────────────────────┐
│                                                                  │
│         ░░░░░░ fond sombre semi-transparent ░░░░░░              │
│                                                                  │
│                    ┌─────────────────────┐                       │
│                    │                     │                       │
│                    │    🏠               │                       │
│                    │                     │                       │
│                    │  Analyse en cours   │                       │
│                    │                     │                       │
│                    │  ████████░░░  67%   │                       │
│                    │                     │                       │
│                    │  ✓ Rendements       │                       │
│                    │  ✓ Régimes fiscaux  │                       │
│                    │  ● Projection...    │                       │
│                    │                     │                       │
│                    └─────────────────────┘                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Implémentation :**
- Fixed inset-0, z-[100], backdrop-blur-sm bg-black/30
- Card centrée : bg-white, rounded-3xl, shadow-2xl, p-10, max-w-sm
- Barre de progression : gradient ambre, rounded-full, h-2, animation width 0→100% en 1.8s
- Les étapes staggerent (opacity + translateY, 400ms chacune)
- À la fin : la card scale(1.02) brièvement puis l'overlay fade-out → scroll vers les résultats

---

## PARTIE C — LES RÉSULTATS (refonte complète de la composition)

### C.0 Principe : alternance de "bandes"

Les résultats ne sont plus une succession monotone de cards blanches. Ce sont des **bandes alternées** de couleurs/compositions différentes :

```
BANDE 1 — HERO (fond ambre gradient)     ← verdict + chiffre héro
BANDE 2 — CARTES (fond blanc)            ← 3 cartes résumé
BANDE 3 — COÛT (fond off-white)          ← section coût
BANDE 4 — GRAPHIQUE (fond blanc)         ← rentabilité + graphique
BANDE 5 — FISCALITÉ (fond sombre !)      ← impact fiscal sur fond dark
BANDE 6 — EMPRUNT (fond off-white)       ← détails emprunt
BANDE 7 — REVENTE (fond blanc)           ← plus-value + bilan
BANDE 8 — EXPERT (fond très pâle)        ← indicateurs + paywall
BANDE 9 — CTA (fond ambre gradient)      ← inscription
```

**L'alternance claire/sombre est LA clé** pour casser la monotonie. La section Fiscalité sur fond sombre est un breakpoint visuel fort — l'utilisateur sait qu'il entre dans une section différente.

### C.1 BANDE HERO — Le verdict

```
┌────────────────────────── full width ────────────────────────────────┐
│                                                                      │
│  ░░░░░░░░░░░░░░░ gradient ambre pâle → blanc ░░░░░░░░░░░░░░░░░░░  │
│  ░░                                                              ░░  │
│  ░░                                                              ░░  │
│  ░░           En 2046, cet investissement                        ░░  │
│  ░░               vous aura enrichi de                           ░░  │
│  ░░                                                              ░░  │
│  ░░               ┌────────────────────┐                         ░░  │
│  ░░               │    52 815 €        │   ← chiffre ÉNORME     ░░  │
│  ░░               │                    │      text-5xl md:text-7xl░░ │
│  ░░               └────────────────────┘      ambre, countUp     ░░  │
│  ░░                                                              ░░  │
│  ░░            ╭──────────────────────────╮                      ░░  │
│  ░░            │ ✅ Investissement correct │  ← badge pill       ░░  │
│  ░░            ╰──────────────────────────╯                      ░░  │
│  ░░                                                              ░░  │
│  ░░    Effort 376€/mois · Patrimoine 244k€ · LMNP réel         ░░  │
│  ░░                                                              ░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
└──────────────────────────────────────────────────────────────────────┘
```

**Le chiffre doit être ÉNORME.** text-5xl sur mobile, text-7xl sur desktop (7rem). C'est LE premier élément que l'œil voit. Couleur ambre-500. Font serif. CountUp de 0 à la valeur en 1.2s.

**Le background :** gradient radial (pas linéaire) centré sur le chiffre, ambre-50 au centre → transparent aux bords. Plus un pattern SVG très discret (cercles concentriques ou dots grid en opacity 0.03).

**Forme décorative :** Un grand cercle SVG ambre très pâle (opacity 0.08, diamètre ~400px) centré derrière le chiffre. Ça crée un "spotlight" subtil.

### C.2 BANDE CARTES — Les 3 cards

```
┌────────────────────────── fond blanc ────────────────────────────────┐
│                                                                      │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐  │
│  │ ┌──┐              │ │ ┌──┐              │ │ ┌──┐              │  │
│  │ │💰│ Coût         │ │ │📈│ Rentabilité  │ │ │📋│ Fiscalité   │  │
│  │ └──┘              │ │ └──┘              │ │ └──┘              │  │
│  │                   │ │                   │ │                   │  │
│  │ Année 1           │ │                   │ │ Sans invest       │  │
│  │   -377€/mois      │ │   244 038€       │ │   8 165€          │  │
│  │                   │ │                   │ │                   │  │
│  │ Années suivantes  │ │ Rendement  3,86%  │ │ Avec invest       │  │
│  │   -363€/mois      │ │ Cash-flow -376€  │ │   8 165€          │  │
│  │                   │ │                   │ │                   │  │
│  │ Patrimoine 20 ans │ │ En 20 ans         │ │ Économie/an       │  │
│  │   244 038€        │ │   244 038€       │ │   0€              │  │
│  │                   │ │                   │ │                   │  │
│  │  Voir détail →    │ │  Voir détail →   │ │  Voir détail →   │  │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Ce qui change vs V2.2 :**
- Les cards ont une **icône dans un cercle coloré** en haut à gauche (40×40, rounded-full, fond teinté)
- Le chiffre principal de chaque card est en **text-2xl font-bold** — beaucoup plus grand que le reste
- La card "Rentabilité" met le patrimoine total en vedette (le plus gros chiffre)
- Les cards ont une ombre plus prononcée : `box-shadow: 0 4px 24px rgba(0,0,0,0.08)`
- border-radius: 20px
- Au hover : translateY(-4px), shadow plus forte — l'effet de "carte qui se soulève"
- La bordure gauche colorée est à 3px (pas 4px) pour être plus fine et élégante

### C.3 BANDE COÛT — Le breakdown mensuel

Fond bg-[#F8F7F3] (off-white chaud, légèrement plus foncé que la bande hero).

**Changement majeur : le montant de l'effort est dans un GRAND bloc hero :**

```
┌────────────────────────── fond off-white ────────────────────────────┐
│                                                                      │
│  Combien ça me coûte par mois ?            (titre serif, text-3xl)  │
│                                                                      │
│  ○──○──○──○──○──○──○──○──○──○──●  2045     (year slider)            │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │              VOTRE EFFORT MENSUEL                              │  │
│  │                                                                │  │
│  │                 -318 €                                         │  │
│  │                  /mois           ← text-5xl, font-serif        │  │
│  │                                    couleur --sim-effort        │  │
│  │              Soit 3 816€ par an                                │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│            fond: gradient(effort-bg → blanc), rounded-2xl            │
│                                                                      │
│  ┌──── Revenus ──────────┐  ┌──── Dépenses ─────────────┐          │
│  │                       │  │                            │          │
│  │  Loyer HC    1 311€   │  │  Crédit        1 021€      │          │
│  │  Vacance      -50€    │  │  Assurance        50€      │          │
│  │  ─────────────────    │  │  Taxe foncière   121€      │          │
│  │  Total      1 261€    │  │  PNO              18€      │          │
│  │                       │  │  Copro            73€      │          │
│  │    barre verte        │  │  Entretien        36€      │          │
│  │    ████████████████   │  │  Impôts          260€      │          │
│  │                       │  │  ─────────────────────     │          │
│  │                       │  │  Total         1 579€      │          │
│  │                       │  │                            │          │
│  │                       │  │    barre rouge             │          │
│  │                       │  │    ████████████████████    │          │
│  └───────────────────────┘  └────────────────────────────┘          │
│                                                                      │
│  💡 Astuce : en allongeant à 25 ans, l'effort descend à -142€.     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**L'effort mensuel est LE premier élément**, en text-5xl font-serif. Pas noyé en bas des colonnes. AVANT les détails.

**Barres visuelles** sous chaque colonne : une barre horizontale verte (revenus) et rouge (dépenses), proportionnelles aux montants. L'utilisateur VOIT le déséquilibre d'un coup d'œil.

### C.4 BANDE GRAPHIQUE — Rentabilité

Fond blanc. Section plus aérée avec le graphique patrimoine en vedette :

```
┌────────────────────────── fond blanc ────────────────────────────────┐
│                                                                      │
│  Combien ça rapporte ?                     (titre serif, text-3xl)  │
│                                                                      │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                               │
│  │ 5%   │ │ 3,86%│ │ 3,86%│ │ 5,15%│    ← pills avec fond teinté  │
│  │ brut │ │ net  │ │net-n │ │ TRI  │       le meilleur en ambre    │
│  └──────┘ └──────┘ └──────┘ └──────┘                               │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │  Évolution du patrimoine                                      │  │
│  │                                                                │  │
│  │  255k ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ╱──  valeur   │  │
│  │       ╲                                    ╱──     bien       │  │
│  │  170k  ╲─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─╱──                     │  │
│  │          ███████████████████████████████    patrimoine net     │  │
│  │   85k     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  (area fill ambre)│  │
│  │                                                                │  │
│  │    0k ────────────────────────────────────                     │  │
│  │       ── ── ── ── ── ── ── ── ── ──       cash-flow cumulé   │  │
│  │  -85k                                                          │  │
│  │       A1  A3  A5  A7  A9  A11 A13 A15 A17 A19                │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │  🏆 Votre investissement rapporte 7,6× plus que le Livret A   │  │
│  │                                                                │  │
│  │  Votre investissement  ████████████████████████████  +244 038€ │  │
│  │  Bourse (S&P 500)     ██████████████                +114 787€ │  │
│  │  Livret A             █████                          +32 244€ │  │
│  │  Assurance-vie        ████                           +19 438€ │  │
│  │                                                                │  │
│  │  Base : même apport initial placé sur 20 ans                  │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Le graphique patrimoine** : la courbe "patrimoine net" est remplie en area fill avec un gradient ambre (ambre-200 en bas → transparent en haut). C'est LA courbe principale. Les autres courbes sont en trait fin.

**KPI pills** : au lieu de 4 cards rectangulaires avec un fond gris uniforme, les pills KPI ont un fond teinté individuel. Le meilleur KPI (le plus élevé) a un fond ambre-50 + bordure ambre. Les autres ont un fond neutral-50.

### C.5 BANDE FISCALITÉ — FOND SOMBRE (le breakpoint visuel)

C'est le changement le plus impactant. La section fiscalité est sur **fond sombre** :

```
┌────────────────────────── fond #1A1A1A ─────────────────────────────┐
│                                                                      │
│  Quel impact sur mes impôts ?    (titre serif, text-3xl, BLANC)     │
│                                                                      │
│  ○──○──○──○──○──○──○──○──○──○──●  (dots blancs, sélection ambre)   │
│                                                                      │
│  ┌────────── bg-white/10 ──────┐  ┌────── bg-white/10 + border ──┐  │
│  │                             │  │                               │  │
│  │  Sans investissement        │  │  Avec investissement          │  │
│  │                             │  │                               │  │
│  │  Revenu imposable           │  │  Revenus fonciers             │  │
│  │  24 495€        (blanc)     │  │  +15 734€      (ambre)       │  │
│  │                             │  │                               │  │
│  │  Impôt                      │  │  Impôt total                  │  │
│  │  8 165€         (blanc)     │  │  11 280€       (blanc)       │  │
│  │                             │  │                               │  │
│  └─────────────────────────────┘  └───────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  📈 Hausse des impôts : +3 115€/an                            │  │
│  │  Soit +260€/mois                                bg-red-500/20 │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Comparaison des régimes       (titre en blanc)                     │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Régime          │  Impôt/an  │  Cash-flow/m  │               │  │
│  │  ─────────────────────────────────────────────────────────     │  │
│  │  Micro-foncier   │   3 568€   │    -673€      │               │  │ 
│  │  Réel 2044       │   1 411€   │    -494€      │               │  │
│  │  ★ SCI à l'IS   │      0€    │    -376€      │  Optimal      │  │ fond ambre/10
│  │  Pinel 6 ans     │     514€   │    -419€      │               │  │
│  │  Pinel 9 ans     │     514€   │    -419€      │               │  │
│  │  Pinel 12 ans    │     514€   │    -419€      │               │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                      (tableau en bg-white/5, texte blanc/80)        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Pourquoi fond sombre ici ?**
1. Ça crée un breakpoint visuel fort — l'utilisateur comprend qu'il entre dans une section différente
2. Les impôts sont "le côté sombre" de l'investissement — ça colle sémantiquement
3. Le contraste attire l'attention sur les chiffres importants (hausse/baisse)
4. Les meilleures apps (Linear, Vercel, Stripe) alternent sections claires et sombres

**Les cards Sans/Avec** : fond blanc à 10% d'opacité (glassmorphism léger), texte blanc
**Le badge hausse** : fond rouge à 20% d'opacité, texte rouge-300
**Le tableau** : fond blanc à 5%, texte blanc à 80%, la ligne optimale a un fond ambre à 10%

### C.6 BANDE EMPRUNT — Layout asymétrique

Fond off-white. Ici on introduit un layout asymétrique pour casser la monotonie :

```
┌────────────────────────── fond off-white ────────────────────────────┐
│                                                                      │
│  Comment gérer mon emprunt ?               (titre serif, text-3xl)  │
│                                                                      │
│  ┌─────────────── 55% ──────────────┐ ┌──────── 45% ──────────────┐│
│  │                                   │ │                            ││
│  │  Investissement global            │ │  Votre crédit              ││
│  │                                   │ │                            ││
│  │  Prix du bien       0€            │ │  Capital       176 000€   ││
│  │  Frais notaire      0€            │ │  Mensualité      1 071€   ││
│  │  Travaux        8 000€            │ │  Durée         240 mois   ││
│  │  Ameublement    5 003€            │ │  Taux             3,5%    ││
│  │  Frais bancaires 2 292€           │ │  Assurance       0,34%    ││
│  │  └ Garantie     2 292€            │ │                            ││
│  │  ─────────────────────            │ │  Coût du prêt   80 944€   ││
│  │  TOTAL        216 000€            │ │  └ Intérêts     68 975€   ││
│  │                                   │ │  └ Assurance    11 969€   ││
│  │         (fond blanc, shadow)      │ │                            ││
│  └───────────────────────────────────┘ │    (fond bleu-50, shadow,  ││
│                                         │     bordure gauche bleue)  ││
│                                         └────────────────────────────┘│
│                                                                      │
│  ▸ Tableau d'amortissement                (dépliable)               │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

La card "Votre crédit" est légèrement plus étroite (45% vs 55%) et a un fond bleu très pâle. C'est un détail mais l'asymétrie crée du dynamisme visuel. Le total "216 000€" est en ambre-600, text-xl, font-bold.

### C.7 BANDE REVENTE — Bilan avec le bloc sombre

Fond blanc pour les données de revente, puis le "Bilan total" dans un bloc sombre (comme actuellement — c'est le meilleur élément existant) :

Le bilan total garde son fond sombre (#1A1A1A) avec les montants en vert/rouge. Mais le "Gain net total" est en **text-4xl font-serif ambre-400** — beaucoup plus grand qu'actuellement.

Ajouter sous le gain total :

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ╭───────────────────────────────────────────╮                  │
│  │           Rendement total : +137%          │   ← pill ambre  │
│  │           sur votre apport de 40 000€      │      text-xl    │
│  ╰───────────────────────────────────────────╯                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

C'est LE chiffre que l'investisseur va retenir et citer à ses amis. Il doit être dans un pill/badge proéminent, pas dans une ligne de texte gris.

### C.8 BANDE EXPERT — Tableau condensé avec heatmap

Le tableau condensé (années 1, 5, 10, 15, 20) est bon. Le heatmap rouge/vert aussi. Garder l'implémentation V2.2.

Ajouter un header de section plus premium :

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  📊  Pour les investisseurs expérimentés                        │
│  ─────────────────────────────────────────                      │
│                                                                  │
│  ┌──────┐    ┌──────┐    ┌──────┐                               │
│  │ TRI  │    │ VAN  │    │ Point│                               │
│  │5,15% │    │35275€│    │mort  │                               │
│  │      │    │      │    │  —   │                               │
│  └──────┘    └──────┘    └──────┘                               │
│                                                                  │
│  [Tableau condensé avec heatmap — garder V2.2]                  │
│                                                                  │
│  ▸ Voir les 20 années                                           │
│                                                                  │
│  [Sauvegarder]  [Exporter PDF]  [Partager]                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### C.9 BANDE CTA — Inscription

La dernière bande utilise le même gradient ambre que le header du formulaire, créant un "bookend" visuel :

```
┌────────────────────────── gradient ambre ────────────────────────────┐
│                                                                      │
│         Cette simulation vous a été utile ?                         │
│                                                                      │
│    Avec Coridor, gérez vos biens de A à Z :                        │
│    baux, quittances, paiements, états des lieux.                    │
│                                                                      │
│    [ Découvrir Coridor — Gratuit ]          [ 🔗 Partager ]         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## PARTIE D — NAV STICKY

La nav sticky ne change pas dans son fonctionnement (scroll-spy) mais son style s'adapte au fond de chaque section :

- Sections claires : nav avec fond blanc/95 + backdrop-blur
- Section Fiscalité (fond sombre) : nav avec fond gris-900/95 + backdrop-blur, texte blanc

L'onglet actif a un fond ambre-50 avec texte ambre-600 (sections claires) ou fond ambre-500/20 avec texte ambre-300 (section sombre).

---

## PARTIE E — DARK MODE

En dark mode :
- Le gradient ambre du hero devient plus sombre (ambre-900/30 → transparent)
- Les bandes "off-white" deviennent gris-900 (#111111)
- Les bandes "blanches" deviennent gris-950 (#0A0A0A)  
- La bande fiscalité reste sombre (elle est déjà sombre en light mode)
- Les cards ont des borders au lieu des shadows (border neutral-800)
- Le cercle SVG décoratif derrière le chiffre hero est en ambre-500/5

---

## Fichiers impactés

| Fichier | Action |
|---|---|
| `app/globals.css` | Variables bandes (--band-hero, --band-alt, --band-dark, etc.) |
| `components/simulator/SimulatorResults.tsx` | Structure en bandes alternées, full-width sections |
| `components/simulator/VerdictBadge.tsx` | Refonte hero : chiffre text-7xl, cercle SVG backdrop, gradient |
| `components/simulator/EssentialSummary.tsx` | Cards avec icônes en cercles, shadow renforcée, border-radius 20px |
| `components/simulator/CostTab.tsx` | Effort en hero text-5xl AVANT les colonnes, barres visuelles |
| `components/simulator/ProfitabilityTab.tsx` | Area fill ambre sur patrimoine net, titre dynamique 🏆 |
| `components/simulator/FiscalImpactTab.tsx` | **FOND SOMBRE** — glassmorphism cards, texte blanc |
| `components/simulator/LoanTab.tsx` | Layout asymétrique 55/45 |
| `components/simulator/ResaleTab.tsx` | Gain total text-4xl serif, pill rendement % |
| `components/simulator/ScrollSpyNav.tsx` | Style adaptatif selon le fond de section (clair/sombre) |
| `components/simulator/SimulatorForm.tsx` | Form card border-radius 24px, mini-cards apport |
| `components/simulator/CalculationLoader.tsx` | Fullscreen overlay au lieu de in-page |
| `components/simulator/StoryBar.tsx` | Résumés sur une ligne, dots plus compacts |

## Vérifications

- [ ] L'alternance des bandes est visible : ambre → blanc → off-white → blanc → **SOMBRE** → off-white → blanc
- [ ] Le chiffre hero est en text-7xl sur desktop et countUp fonctionne
- [ ] Le cercle SVG décoratif est visible derrière le chiffre hero
- [ ] La section Fiscalité a un fond sombre avec texte blanc lisible
- [ ] L'effort mensuel est en text-5xl AVANT les colonnes détaillées
- [ ] Les barres visuelles (verte revenus, rouge dépenses) sont proportionnelles
- [ ] Le titre "7,6× plus que le Livret A" est généré dynamiquement
- [ ] Le bilan total a le gain en text-4xl serif ambre + pill rendement %
- [ ] Le CalculationLoader est en fullscreen overlay, pas in-page
- [ ] Le formulaire a des cards à border-radius 24px
- [ ] La nav sticky change de style sur la section sombre
- [ ] Dark mode : les bandes sont différenciées, pas uniformément sombres
- [ ] Mobile : tout est responsive, pas de scroll horizontal
- [ ] npm run build → 0 erreurs
