# Simulateur d'investissement locatif — V2.1 : Refonte UI Résultats

## Contexte

La V2 a enrichi le formulaire, les régimes fiscaux et le moteur de calcul. Mais les résultats sont encore présentés en mode "expert" (KPIs techniques, tableaux). L'investisseur débutant ne comprend pas en 5 secondes si son investissement est bon.

**Inspiration :** Horiz.io présente les résultats par questions humaines (Coût, Rentabilité, Impôts, Emprunt, Revente) avec une navigation latérale et un slider temporel par année. On fait mieux : un résumé simplifié en haut + onglets détaillés en dessous.

## Prérequis

La V2 doit être terminée et fonctionnelle (nouveaux champs, régimes fiscaux, moteur mis à jour). Ce sprint modifie UNIQUEMENT la page résultats et les composants d'affichage. Pas de changement au moteur de calcul.

## Fichiers à lire avant de coder

- `components/simulator/SimulatorResults.tsx` — résultats actuels (KPI cards + onglets)
- `components/simulator/SimulatorChart.tsx` — graphiques Recharts
- `components/simulator/LoanDurationComparison.tsx` — comparaison durées (créé en V2)
- `services/InvestmentSimulatorService.ts` — pour comprendre les données disponibles dans InvestmentResult

⚠️ NE PAS modifier le moteur de calcul. Uniquement l'affichage.

---

## Architecture de la nouvelle page résultats

```
┌──────────────────────────────────────────────────────────────────┐
│  RÉSUMÉ SIMPLIFIÉ — "L'essentiel en un coup d'œil"             │
│  3 cartes répondant aux 3 questions de l'investisseur           │
├──────────────────────────────────────────────────────────────────┤
│  VERDICT — Badge + phrase résumé                                │
├──────────────────────────────────────────────────────────────────┤
│  NAVIGATION PAR ONGLETS — Détails par thème                     │
│  [Coût] [Rentabilité] [Fiscalité] [Emprunt] [Revente]          │
│                                                                  │
│  Chaque onglet = une question humaine avec slider année         │
├──────────────────────────────────────────────────────────────────┤
│  SECTION EXPERT (dépliable) — KPIs techniques, tableaux         │
└──────────────────────────────────────────────────────────────────┘
```

---

## 1. Résumé simplifié — "L'essentiel"

### 1.1 Composant EssentialSummary.tsx

3 cartes côte à côte (responsive : empilées sur mobile) :

```
┌─────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│  💰 Coût mensuel     │ │  📈 Ce que ça rapporte │ │  📋 Impact fiscal     │
│                     │ │                      │ │                      │
│  Année 1    -120€   │ │  Rendement net  5,2% │ │  Impôts sans   10 580€│
│  Années 2+   -85€   │ │  Cash-flow    +80€/m │ │  Impôts avec   12 229€│
│  Revente   +45 200€ │ │  En 20 ans   +192k€  │ │  Surcoût/an   +1 649€ │
│                     │ │                      │ │                      │
│  ▼ Voir détail      │ │  ▼ Voir détail       │ │  ▼ Voir détail       │
└─────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

**Carte 1 — "Combien ça me coûte ?"**
- Année 1 : effort d'épargne mensuel = mensualité + charges - loyer net (après vacance)
  - Si positif → "Vous devez sortir X€/mois de votre poche"
  - Si négatif → "Vous gagnez X€/mois dès le départ" (texte vert)
- Années suivantes : même calcul mais avec loyer revalorisé (IRL)
- À la revente : patrimoine net = prix revente - capital restant dû - impôt plus-value
- Couleur : rouge si effort > 200€, orange si 0-200€, vert si cash-flow positif

**Carte 2 — "Combien ça rapporte ?"**
- Rendement net-net : X,X%
- Cash-flow mensuel moyen : +/- X€
- Patrimoine constitué en N ans : X€ (valeur bien + loyers cumulés - charges - crédit)
- Couleur : vert si rendement > 5%, orange si 3-5%, rouge si < 3%

**Carte 3 — "Quel impact sur mes impôts ?"**
- Impôt SANS investissement : X€/an (calculé depuis revenus du foyer seuls)
- Impôt AVEC investissement : X€/an (revenus + revenus fonciers)
- Différence : +X€ ou -X€ (en cas de déficit foncier ou réduction Pinel)
- Si hausse → icône flèche rouge "Hausse des impôts" (comme Horiz.io)
- Si baisse → icône flèche verte "Réduction d'impôts"
- Si Pinel/Denormandie → afficher la ligne "Défiscalisation : -X€"

**Clic "Voir détail"** → scroll smooth vers l'onglet correspondant en dessous.

### 1.2 Composant VerdictBadge.tsx

Sous les 3 cartes, un verdict résumé en une phrase :

```
┌──────────────────────────────────────────────────────────────────┐
│  ✅ INVESTISSEMENT RENTABLE                                      │
│  Avec un effort de 85€/mois, vous constituez un patrimoine de   │
│  192 000€ en 20 ans. Rendement net-net : 5,2%.                  │
│  Régime fiscal recommandé : LMNP au réel (le plus avantageux).  │
└──────────────────────────────────────────────────────────────────┘
```

Logique du verdict :
- ✅ RENTABLE : cash-flow positif OU (rendement > 4% ET TRI > 6%)
- ⚠️ CORRECT : rendement 2-4% OU TRI 3-6%
- ❌ PEU RENTABLE : rendement < 2% ET TRI < 3%
- 💡 DÉFISCALISANT : rendement faible mais réduction d'impôt significative (Pinel)

Badge couleur : vert / orange / rouge / bleu (défiscalisation).
Phrase générée dynamiquement depuis les résultats.

---

## 2. Navigation par onglets — Détails par thème

### 2.1 Structure des onglets

Composant ResultTabs.tsx avec 5 onglets horizontaux :

```
[💰 Coût] [📈 Rentabilité] [📋 Fiscalité] [🏦 Emprunt] [🏠 Revente]
```

Chaque onglet contient :
- Un titre en question humaine
- Un slider temporel (année) quand c'est pertinent
- Des données détaillées qui changent selon l'année sélectionnée

### 2.2 Composant YearSlider.tsx

Slider horizontal avec cercles par année (comme Horiz.io screenshot 1).

```
○───────○───────○───────○───────●───────○───────○
2026    2027    2028    2029    2030    2031    2032
                                ▲
                          Année sélectionnée
```

Props :
```typescript
interface YearSliderProps {
  startYear: number; // année d'achat
  endYear: number; // startYear + projectionYears
  selectedYear: number;
  onYearChange: (year: number) => void;
  highlightYears?: { year: number; color: string; label: string }[];
  // Ex: { year: 2030, color: 'green', label: 'Breakeven' }
}
```

Design :
- Cercles vides pour les années non sélectionnées
- Cercle plein vert pour l'année sélectionnée
- Zone colorée en violet/bleu clair pour les périodes spéciales (ex: période Pinel)
- Labels années en dessous
- Responsive : sur mobile, afficher un select dropdown au lieu du slider

### 2.3 Onglet "Coût" — "Combien ça me coûte par mois ?"

Composant CostTab.tsx

Avec le YearSlider. Quand l'utilisateur change l'année, les chiffres se mettent à jour.

```
┌──────────────────────────────────────────────────────────────────┐
│  Combien ça me coûte par mois ?                                 │
│                                                                  │
│  ○────○────○────○────●────○────○────○────○────○                  │
│  2026 2027 2028 2029 2030 2031 2032 2033 2034 2035              │
│                                                                  │
│  ┌─────────────────────────┐ ┌─────────────────────────┐        │
│  │  REVENUS MENSUELS       │ │  DÉPENSES MENSUELLES     │        │
│  │                         │ │                          │        │
│  │  Loyer HC       850€    │ │  Mensualité crédit 536€  │        │
│  │  (vacance -4%)  -34€    │ │  Assurance prêt    27€   │        │
│  │                         │ │  Taxe foncière     75€   │        │
│  │                         │ │  Assurance PNO     13€   │        │
│  │                         │ │  Copropriété       40€   │        │
│  │                         │ │  GLI (3,5%)        30€   │        │
│  │                         │ │  Entretien         25€   │        │
│  │                         │ │  Impôts fonciers  137€   │        │
│  │                         │ │                          │        │
│  │  Total          816€    │ │  Total             883€  │        │
│  └─────────────────────────┘ └─────────────────────────┘        │
│                                                                  │
│  ┌──────────────────────────────────────────────┐               │
│  │  EFFORT D'ÉPARGNE MENSUEL :  -67€/mois       │               │
│  │  Soit 804€/an à sortir de votre poche        │               │
│  └──────────────────────────────────────────────┘               │
│                                                                  │
│  💡 En année 5, le loyer revalorisé (+IRL) couvrira vos         │
│     dépenses. Cash-flow positif à partir de 2031.               │
└──────────────────────────────────────────────────────────────────┘
```

Données par année :
- Revenus : loyer HC × 12 × (1 - vacance), revalorisé chaque année
- Dépenses : mensualité, assurance, taxe foncière, PNO, copro, GLI, entretien, impôts
- Les impôts changent chaque année (amortissement LMNP diminue, loyer augmente)
- Effort = revenus - dépenses (mensuel)

Message contextuel en bas :
- Si effort négatif toute la durée → "Cet investissement nécessite un effort d'épargne constant"
- Si breakeven identifié → "Cash-flow positif à partir de [année]"
- Si cash-flow positif dès le départ → "Cet investissement s'autofinance dès le départ"

### 2.4 Onglet "Rentabilité" — "Combien ça me rapporte ?"

Composant ProfitabilityTab.tsx

```
┌──────────────────────────────────────────────────────────────────┐
│  Combien ça rapporte ?                                          │
│                                                                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │ Rdt brut   │ │ Rdt net    │ │ Rdt net-net│ │ TRI        │   │
│  │   7,8%     │ │   5,9%     │ │   5,2%     │ │   8,1%     │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
│                                                                  │
│  [Graphique : Évolution du patrimoine sur N ans]                │
│  ── Patrimoine net (bleu)                                       │
│  ── Cash-flow cumulé (vert)                                     │
│  ── Capital restant dû (rouge, décroissant)                     │
│  ── Valeur du bien (pointillés, croissant)                      │
│                                                                  │
│  ┌──────────────────────────────────────────────┐               │
│  │  COMPARAISON PLACEMENTS                      │               │
│  │                                               │               │
│  │  Immobilier (cet investissement)  +192 000€  │ ████████████  │
│  │  Bourse (7%/an)                   +148 000€  │ █████████     │
│  │  Assurance-vie fonds € (2%/an)    + 42 000€  │ ███           │
│  │  Livret A (3%/an)                 + 52 000€  │ ████          │
│  │                                               │               │
│  │  Base : même effort mensuel (85€) sur 20 ans │               │
│  └──────────────────────────────────────────────┘               │
└──────────────────────────────────────────────────────────────────┘
```

**Graphique patrimoine** : Recharts AreaChart, 4 courbes superposées. L'utilisateur voit visuellement la constitution de patrimoine.

**Comparaison placements** : barres horizontales. Base de comparaison = même apport initial + même effort mensuel placés ailleurs. Déjà calculé par le moteur V1, juste améliorer l'affichage.

### 2.5 Onglet "Fiscalité" — "Quel impact sur mes impôts ?"

Composant FiscalImpactTab.tsx

Avec le YearSlider (comme screenshot Horiz.io 1).

```
┌──────────────────────────────────────────────────────────────────┐
│  Quel sera l'impact sur mes impôts ?                            │
│                                                                  │
│  ○────○────○────○────●────○────○────○────○────○                  │
│  2026 2027 2028 2029 2030 2031 2032 2033 2034 2035              │
│                                                                  │
│  ┌───────────────────────┐  ┌───────────────────────┐           │
│  │  SANS INVESTISSEMENT  │  │  AVEC INVESTISSEMENT   │           │
│  │                       │  │                        │           │
│  │  Revenu imposable     │  │  Revenu imposable      │           │
│  │  50 000€              │  │  55 200€               │           │
│  │                       │  │  (+ 5 200€ fonciers)   │           │
│  │  Impôt : 10 580€     │  │  Impôt : 12 229€       │           │
│  │                       │  │  Défiscalisation: 0€   │           │
│  │                       │  │                        │           │
│  │                       │  │  Net à payer: 12 229€  │           │
│  └───────────────────────┘  └───────────────────────┘           │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │  📊 Hausse des impôts : +1 649€/an               │           │
│  │  Soit +137€/mois (inclus dans le coût mensuel)   │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │  COMPARAISON RÉGIMES FISCAUX                      │           │
│  │                                                   │           │
│  │  Régime          │ Impôt/an │ Cash-flow │  VAN    │           │
│  │  ────────────────┼──────────┼──────────┼─────────│           │
│  │  ★ LMNP réel    │  1 100€  │  +80€/m  │ 42 000€ │           │
│  │  Micro-BIC       │  1 400€  │  +55€/m  │ 38 000€ │           │
│  │  Réel foncier    │  1 649€  │  +22€/m  │ 35 000€ │           │
│  │  Micro-foncier   │  1 800€  │   -5€/m  │ 31 000€ │           │
│  │                                                   │           │
│  │  ★ = régime recommandé (meilleure VAN)           │           │
│  └──────────────────────────────────────────────────┘           │
└──────────────────────────────────────────────────────────────────┘
```

**Clé :** le side-by-side "SANS / AVEC investissement" est très parlant. L'investisseur voit immédiatement le surcoût fiscal. Si un dispositif Pinel/Denormandie est actif, la ligne "Défiscalisation" apparaît et le résultat peut être positif (baisse d'impôts).

Le slider année permet de voir l'évolution : en LMNP réel, l'amortissement réduit l'impôt les premières années puis l'impact augmente quand l'amortissement diminue.

### 2.6 Onglet "Emprunt" — "Comment gérer mon emprunt ?"

Composant LoanTab.tsx

Reprend le LoanDurationComparison.tsx (V2) + ajoute un résumé comme Horiz.io screenshot 2 :

```
┌──────────────────────────────────────────────────────────────────┐
│  Comment gérer mon emprunt ?                                     │
│                                                                  │
│  ┌─────────────────────────┐ ┌──────────────────────────┐       │
│  │  INVESTISSEMENT GLOBAL  │ │  VOTRE CRÉDIT             │       │
│  │                         │ │                           │       │
│  │  Prix du bien   109 700€│ │  Capital emprunté 109 700€│       │
│  │  Frais notaire    8 433€│ │  Mensualité      536,84€  │       │
│  │  Frais bancaires  2 721€│ │  Durée           240 mois │       │
│  │  ├ Frais dossier    950€│ │  Assurance        27,43€  │       │
│  │  └ Crédit Logement 1771€│ │  Taux              1,1%   │       │
│  │                         │ │                           │       │
│  │  Total        120 854€  │ │  Coût du prêt   19 141€  │       │
│  │                         │ │  ├ Intérêts     12 559€   │       │
│  │                         │ │  └ Assurance     6 582€   │       │
│  └─────────────────────────┘ └──────────────────────────┘       │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │  DURÉE OPTIMALE D'EMPRUNT                        │           │
│  │  (tableau comparaison 15/20/25 ans — V2 existant)│           │
│  └──────────────────────────────────────────────────┘           │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │  TABLEAU D'AMORTISSEMENT (dépliable)             │           │
│  │  (tableau mensuel/annuel — V1 existant)          │           │
│  └──────────────────────────────────────────────────┘           │
└──────────────────────────────────────────────────────────────────┘
```

### 2.7 Onglet "Revente" — "Quelle plus-value à la revente ?"

Composant ResaleTab.tsx

Avec le YearSlider. L'utilisateur choisit l'année de revente et voit l'impact.

```
┌──────────────────────────────────────────────────────────────────┐
│  Quelle sera la plus-value à la revente ?                       │
│                                                                  │
│  ○────○────○────○────●────○────○────○────○────○                  │
│  2026 2027 2028 2029 2030 2031 2032 2033 2034 2035              │
│                        ▲                                         │
│                   Revente en 2030 (5e année)                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │  Prix de revente estimé          121 178€        │           │
│  │  (appréciation +1%/an)                           │           │
│  │                                                   │           │
│  │  Plus-value brute                 11 478€        │           │
│  │  Impôt sur la plus-value          -3 512€        │           │
│  │  ├ IR (19%)                       -2 181€        │           │
│  │  └ PS (17,2%)                     -1 331€        │           │
│  │  Abattement durée détention            0€        │           │
│  │  (exonération IR à 22 ans, PS à 30 ans)          │           │
│  │                                                   │           │
│  │  PLUS-VALUE NETTE                  7 966€        │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │  BILAN TOTAL DE L'OPÉRATION                      │           │
│  │                                                   │           │
│  │  Plus-value nette               + 7 966€         │           │
│  │  Cash-flow cumulé (5 ans)       - 4 020€         │           │
│  │  Capital remboursé               22 400€         │           │
│  │                                                   │           │
│  │  GAIN NET TOTAL                 +26 346€         │           │
│  │  Pour un apport initial de       8 433€          │           │
│  │  Soit un rendement de           +312%            │           │
│  └──────────────────────────────────────────────────┘           │
└──────────────────────────────────────────────────────────────────┘
```

**Le "Bilan total de l'opération"** est le chiffre clé. C'est ce que l'investisseur a réellement gagné si il revend à l'année X : plus-value nette + cash-flows cumulés + capital remboursé dans le prêt. Rapporté à l'apport initial, ça donne un % de rendement total sur la période — beaucoup plus parlant que le TRI.

---

## 3. Section Expert (dépliable)

### 3.1 Composant ExpertSection.tsx

En bas de la page, section dépliable "Indicateurs avancés" :

```
▼ Indicateurs avancés (pour les investisseurs expérimentés)

┌──────────────────────────────────────────────────────────────────┐
│  TRI : 8,1%  │  VAN : 42 000€  │  Breakeven : mois 58         │
│                                                                  │
│  [Tableau amortissement complet]                                │
│  [Projection annuelle détaillée — tableau 20 lignes]            │
│  [Export PDF]  [Sauvegarder]  [Partager]                        │
└──────────────────────────────────────────────────────────────────┘
```

C'est ici que les tableaux détaillés et les KPIs techniques vivent. Les boutons export/sauvegarde/partage restent accessibles.

---

## 4. Données à calculer (ajouts au InvestmentResult)

Le moteur V2 calcule déjà la plupart de ces données. Il faut s'assurer que le résultat expose :

```typescript
// Ajouts nécessaires à InvestmentResult
interface InvestmentResult {
  // ... champs V2 existants ...

  // Nouveaux champs pour l'UI V2.1
  taxWithoutInvestment: number; // impôt annuel SANS revenus fonciers
  taxWithInvestment: number; // impôt annuel AVEC revenus fonciers
  taxDifference: number; // surcoût ou économie fiscale

  // Par année (enrichir yearlyProjection existant)
  yearlyProjection: Array<{
    year: number;
    // ... champs existants ...
    monthlyRevenueBreakdown: {
      rentHC: number;
      vacancyDeduction: number;
      netRent: number;
    };
    monthlyExpenseBreakdown: {
      loanPayment: number;
      loanInsurance: number;
      propertyTax: number; // mensuel
      insurancePNO: number;
      coproCharges: number;
      gli: number;
      maintenance: number;
      otherCharges: number;
      monthlyTax: number; // impôt foncier mensualisé
    };
    savingsEffort: number; // effort d'épargne mensuel
    taxWithout: number; // impôt sans investissement cette année
    taxWith: number; // impôt avec investissement cette année
    cumulativeCashflow: number;
    netWorth: number; // valeur bien - capital restant dû
    totalGain: number; // PV nette + cashflow cumulé + capital remboursé
  }>;

  // Verdict
  verdict: 'PROFITABLE' | 'CORRECT' | 'LOW_RETURN' | 'TAX_OPTIMIZED';
  verdictMessage: string; // phrase générée
  recommendedRegime: TaxRegime;
  breakEvenYear?: number; // année du cash-flow positif
}
```

Si ces champs n'existent pas encore dans le résultat V2, les ajouter dans InvestmentSimulatorService.ts au moment de `simulate()`. Le calcul de `taxWithoutInvestment` = appliquer le barème IR aux seuls revenus du foyer (sans foncier). La différence donne l'impact fiscal.

---

## 5. Responsive & Mobile

- 3 cartes résumé : côte à côte desktop, empilées mobile
- YearSlider : slider desktop, select dropdown mobile
- Onglets : tabs horizontaux desktop, accordéon ou swipe mobile
- Tableaux : scroll horizontal mobile
- Section expert : fermée par défaut, toggle

---

## 6. Design

Garder le design system Coridor existant :
- Couleur accent : ambre/cuivre (#E8A838)
- Cards avec ombres légères, coins arrondis
- Badges colorés : vert (bon), orange (moyen), rouge (mauvais), bleu (défiscalisation)
- Transitions douces entre années (animation 200ms sur les chiffres)
- Graphiques Recharts avec la palette Coridor

---

## Fichiers impactés

| Fichier | Action |
|---|---|
| `components/simulator/SimulatorResults.tsx` | **Refonte** — remplacer par la nouvelle architecture |
| `components/simulator/EssentialSummary.tsx` | **Créer** — 3 cartes résumé |
| `components/simulator/VerdictBadge.tsx` | **Créer** — verdict + phrase |
| `components/simulator/ResultTabs.tsx` | **Créer** — navigation onglets |
| `components/simulator/YearSlider.tsx` | **Créer** — slider temporel |
| `components/simulator/CostTab.tsx` | **Créer** — onglet coût mensuel |
| `components/simulator/ProfitabilityTab.tsx` | **Créer** — onglet rentabilité |
| `components/simulator/FiscalImpactTab.tsx` | **Créer** — onglet fiscalité |
| `components/simulator/LoanTab.tsx` | **Créer** — onglet emprunt (intègre LoanDurationComparison) |
| `components/simulator/ResaleTab.tsx` | **Créer** — onglet revente |
| `components/simulator/ExpertSection.tsx` | **Créer** — section dépliable KPIs techniques |
| `services/InvestmentSimulatorService.ts` | **Modifier** — enrichir InvestmentResult (taxWithout, verdict, breakdowns) |
| `components/simulator/SimulatorChart.tsx` | **Modifier** — graphique patrimoine multi-courbes |
| `messages/fr.json` + `messages/en.json` | **Modifier** — nouvelles chaînes |

## Vérifications

- [ ] Les 3 cartes résumé affichent des données correctes et cohérentes
- [ ] Le verdict est pertinent (pas de "RENTABLE" si cash-flow négatif permanent)
- [ ] Le YearSlider met à jour les données en temps réel (pas de rechargement)
- [ ] L'onglet fiscalité montre correctement l'impôt SANS vs AVEC
- [ ] Le bilan total revente = PV nette + cashflow cumulé + capital remboursé
- [ ] Responsive mobile : pas de layout cassé, slider → dropdown
- [ ] Les simulations V1 et V2 sauvegardées s'affichent correctement
- [ ] npm run build → 0 erreurs
