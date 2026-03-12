# Données Patrimoine & Calculs Financiers — Enrichissement /finances

## Contexte

La page `/finances` (prompt V5) affiche des métriques patrimoine (rendement net, equity, plus-value, comparatif placements) qui dépendent de données que le propriétaire n'a pas encore saisies. Ce prompt couvre trois choses :

1. **Audit des données existantes** et ajout des champs manquants sur Property
2. **Collecte progressive** des données via des invitations contextuelles sur /finances
3. **Mapping catégories de dépenses → lignes 2044** pour que la déclaration fiscale soit correcte
4. **Calculs financiers fiscalement exacts** en réutilisant le moteur du simulateur d'investissement

**Règle fondamentale :** ne recoder AUCUNE formule financière. Le `InvestmentSimulatorService` et le `TaxSimulatorService` existent et font déjà tous les calculs (rendement, TRI, plus-value avec abattements, comparaison régimes, comparaison placements). Les importer et les appeler.

---

## ORGANISATION EN TEAM AGENTS

### Agent 1 — Audit & Schema (vérifier l'existant, ajouter les champs manquants)

**Mission :** Auditer le schema Prisma actuel pour identifier quels champs existent déjà. Ajouter uniquement ce qui manque. Migration non-destructive.

**Fichiers à modifier :**
- `prisma/schema.prisma` — Ajouter les champs manquants sur Property

### Agent 2 — Collecte progressive (invitations sur /finances)

**Mission :** Créer les composants d'invitation contextuelle qui apparaissent sur /finances quand des données manquent. Chaque invitation = un seul champ à remplir, un bottom sheet, et la métrique se met à jour instantanément.

**Fichiers à produire :**
- `components/finances/DataInviteCard.tsx` — **Nouveau**
- `components/finances/PropertyDataSheet.tsx` — **Nouveau** (bottom sheet de saisie)

### Agent 3 — Mapping dépenses → 2044 & calculs exacts

**Mission :** Créer le mapping explicite entre les catégories de dépenses Coridor et les lignes de la déclaration 2044. Corriger les calculs de plus-value et de rendement pour qu'ils soient fiscalement exacts en réutilisant les services existants.

**Fichiers à produire/modifier :**
- `lib/finances/expenseTo2044Mapping.ts` — **Nouveau**
- `app/actions/getFinancialReport.ts` — Modifier pour utiliser les services existants

---

## AGENT 1 — AUDIT & SCHEMA

### Étape 1 : Auditer ce qui existe déjà

Avant d'ajouter quoi que ce soit, **grep le schema Prisma** pour trouver les champs existants sur Property. D'après l'audit du projet, voici ce qui existe probablement déjà :

```bash
# Chercher les champs liés à l'investissement sur Property
grep -n "purchasePrice\|loanAmount\|estimatedValue\|acquisitionDate\|zoneTendue\|isFurnished" prisma/schema.prisma
```

**Champs qui existent probablement déjà :**
- `purchasePrice: Int?` — prix d'achat en euros (confirmé dans FEATURE-LEGAL-REMINDERS-SCHEMA.md)
- `isZoneTendue: Boolean` — zone tendue (confirmé dans AUDIT-BAIL-SCHEMA.md)

**Champs qui n'existent probablement PAS :**
- Date d'achat
- Valeur estimée actuelle
- Données d'emprunt (montant, taux, date de fin)

### Étape 2 : Ajouter les champs manquants

Ajouter uniquement ce qui n'existe pas. Vérifier chaque champ avant de l'ajouter :

```prisma
model Property {
  // ... champs existants ...

  // ===== INVESTISSEMENT (ajouter UNIQUEMENT si absent) =====
  // purchasePrice        Int?              // PROBABLEMENT DÉJÀ LÀ — vérifier
  purchaseDate           DateTime? @db.Date  // Date d'achat
  acquisitionMode        String?             // "ACHAT" | "DONATION" | "HERITAGE"
  estimatedCurrentValue  Int?                // Valeur estimée actuelle en euros (saisie manuelle)
  estimatedValueDate     DateTime?           // Date de la dernière estimation (pour savoir si c'est à jour)

  // ===== EMPRUNT =====
  loanAmount             Int?                // Capital emprunté en euros
  loanRate               Float?              // Taux d'intérêt annuel (ex: 1.5 pour 1.5%)
  loanStartDate          DateTime? @db.Date  // Date de début du prêt
  loanEndDate            DateTime? @db.Date  // Date de fin du prêt
  loanMonthlyPayment     Int?                // Mensualité en euros
  loanBank               String?             // Nom de la banque (pour affichage)
}
```

**IMPORTANT :** si `purchasePrice` existe déjà, ne pas le recréer. Si le type est différent (Int vs Float), adapter les calculs, pas le schema.

### Migration

```bash
npx prisma migrate dev --name add-investment-and-loan-fields
```

Tous les champs optionnels → migration non-destructive.

---

## AGENT 2 — COLLECTE PROGRESSIVE

### Principe UX

Les données sont collectées **depuis la page /finances**, pas depuis le formulaire du bien. Le proprio est dans un mindset "finances" quand il visite cette page — c'est le moment où il a envie de voir son rendement et sa plus-value.

**Règles :**
- Une seule invitation à la fois, pas un formulaire de 6 champs
- L'invitation apparaît dans la section "Recommandations" (insights) de /finances
- Chaque invitation montre **ce que le proprio va débloquer** en remplissant
- Le remplissage se fait dans un bottom sheet avec un seul champ principal
- Après validation, la métrique correspondante apparaît instantanément sur la page (optimistic update)

### Ordre de collecte (par valeur débloquée)

| Priorité | Champ | Ce que ça débloque | Message d'invitation |
|----------|-------|-------------------|---------------------|
| 1 | `purchasePrice` | Rendement net, comparatif placements, plus-value brute | "Combien avez-vous payé ce bien ? Découvrez votre rendement réel" |
| 2 | `estimatedCurrentValue` | Patrimoine total, plus-value, equity | "Combien vaut votre bien aujourd'hui ? Découvrez votre plus-value" |
| 3 | `purchaseDate` | Plus-value nette après impôts (abattements durée) | "Quand avez-vous acheté ? Calculez votre plus-value nette après impôts" |
| 4 | `loanAmount` + `loanRate` + `loanEndDate` | Equity nette, capital restant dû, intérêts déductibles | "Renseignez votre crédit pour voir votre equity nette" |

**Logique d'affichage :** ne montrer l'invitation N que si les données N-1 sont remplies pour au moins un bien. Ne pas montrer 4 invitations à la fois.

### DataInviteCard.tsx

Même style que les InsightCards existants (avec Open Doodle en filigrane) mais avec un CTA qui ouvre le bottom sheet :

```typescript
interface DataInviteCardProps {
  title: string;            // "Combien avez-vous payé ce bien ?"
  description: string;      // "Découvrez votre rendement réel et comparez avec le Livret A"
  unlocks: string;          // "Débloque : Rendement net · Comparatif placements"
  doodleName: string;       // "sitting-reading"
  color: string;            // "blue"
  propertyId: string;       // le bien concerné
  propertyName: string;     // pour l'affichage
  fieldToCollect: string;   // "purchasePrice" | "estimatedCurrentValue" | etc.
  onComplete: () => void;   // callback pour refresh
}
```

- Card avec fond coloré léger (`bg-blue-50 border-blue-100`)
- Titre en gras, description, puis ligne "Débloque :" avec les métriques listées
- Bouton CTA : "Renseigner" → ouvre PropertyDataSheet
- Si le proprio a plusieurs biens sans la donnée, montrer le premier bien + "et 2 autres biens"

### PropertyDataSheet.tsx

Bottom sheet avec :
- Titre : "Appartement Lumineux" + adresse
- Le champ principal en gros (ex: input montant € pour le prix d'achat)
- Un bouton "Valider"
- Après validation → server action `PATCH /api/properties/[id]` + optimistic update sur /finances

Pour l'emprunt (priorité 4), le bottom sheet a 3 champs groupés : montant emprunté, taux, date de fin. Mais c'est une seule invitation, pas trois.

**Champs par type :**

| fieldToCollect | Input type | Label | Placeholder |
|---------------|------------|-------|-------------|
| `purchasePrice` | Montant € | Prix d'achat | "250 000" |
| `estimatedCurrentValue` | Montant € | Valeur estimée aujourd'hui | "280 000" |
| `purchaseDate` | Date picker | Date d'achat | "01/2018" (mois/année suffit) |
| `loan` (groupé) | 3 inputs | Montant emprunté / Taux / Date fin | "200 000" / "1.5" / "2038" |

---

## AGENT 3 — MAPPING DÉPENSES → 2044 & CALCULS EXACTS

### Mapping catégories de dépenses → lignes 2044

Créer un fichier de mapping explicite :

```typescript
// lib/finances/expenseTo2044Mapping.ts

/**
 * Mapping entre les catégories de dépenses Coridor
 * et les lignes de la déclaration 2044.
 *
 * Source : formulaire 2044 (revenus fonciers) de la DGFiP
 * https://www.impots.gouv.fr/formulaire/2044/declaration-des-revenus-fonciers
 */

export const EXPENSE_TO_2044: Record<string, {
  ligne: string;
  description2044: string;
  isDeductible: boolean;
}> = {
  // ─── Ligne 221 : Frais d'administration et de gestion ───
  'MANAGEMENT_FEES': {
    ligne: '221',
    description2044: "Frais d'administration et de gestion",
    isDeductible: true,
  },
  'ACCOUNTING': {
    ligne: '221',
    description2044: "Frais d'administration et de gestion",
    isDeductible: true,
  },

  // ─── Ligne 222 : Autres frais de gestion (forfait 20€/lot) ───
  // Note : le forfait de 20€ par lot est automatique, pas lié à une dépense saisie.
  // Ce mapping est pour les frais de gestion réels au-delà du forfait.

  // ─── Ligne 223 : Primes d'assurance ───
  'INSURANCE': {
    ligne: '223',
    description2044: "Primes d'assurance",
    isDeductible: true,
  },
  'INSURANCE_PNO': {
    ligne: '223',
    description2044: "Primes d'assurance",
    isDeductible: true,
  },
  'INSURANCE_GLI': {
    ligne: '223',
    description2044: "Primes d'assurance",
    isDeductible: true,
  },

  // ─── Ligne 224 : Dépenses de réparation, d'entretien et d'amélioration ───
  'MAINTENANCE': {
    ligne: '224',
    description2044: "Dépenses de réparation, d'entretien",
    isDeductible: true,
  },
  'RENOVATION': {
    ligne: '224',
    description2044: "Dépenses de réparation, d'entretien",
    isDeductible: true,
  },
  'PLUMBING': {
    ligne: '224',
    description2044: "Dépenses de réparation, d'entretien",
    isDeductible: true,
  },
  'ELECTRICITY': {
    ligne: '224',
    description2044: "Dépenses de réparation, d'entretien",
    isDeductible: true,
  },
  'HEATING': {
    ligne: '224',
    description2044: "Dépenses de réparation, d'entretien",
    isDeductible: true,
  },
  'CLEANING': {
    ligne: '224',
    description2044: "Dépenses de réparation, d'entretien",
    isDeductible: true,
  },

  // ─── Ligne 227 : Taxes foncières ───
  'TAX_PROPERTY': {
    ligne: '227',
    description2044: "Taxes foncières",
    isDeductible: true,
  },

  // ─── Ligne 250 : Intérêts d'emprunt ───
  // Note : les intérêts d'emprunt ne sont pas une dépense saisie manuellement.
  // Ils sont calculés automatiquement à partir des données d'emprunt (loanAmount, loanRate, loanEndDate).
  // Le mapping est inclus ici pour la complétude de la 2044.

  // ─── Ligne 230 : Total des charges ───
  // Calculé automatiquement = somme des lignes 221 à 227 + 250

  // ─── NON DÉDUCTIBLES ───
  'FURNITURE': {
    ligne: '',
    description2044: "Non déductible (mobilier)",
    isDeductible: false,
  },
  'OTHER': {
    ligne: '',
    description2044: "Autre (vérifier déductibilité)",
    isDeductible: false,
  },
};

/**
 * Agrège les dépenses par ligne 2044.
 */
export function aggregateExpensesFor2044(
  expenses: { category: string; amountCents: number; amountDeductibleCents: number }[]
): { ligne: string; description: string; montant: number }[] {
  const byLigne: Record<string, number> = {};

  for (const expense of expenses) {
    const mapping = EXPENSE_TO_2044[expense.category];
    if (!mapping || !mapping.isDeductible || !mapping.ligne) continue;

    const ligne = mapping.ligne;
    byLigne[ligne] = (byLigne[ligne] || 0) + expense.amountDeductibleCents;
  }

  // Construire le résultat avec les descriptions 2044
  const ligneDescriptions: Record<string, string> = {
    '221': "Frais d'administration et de gestion",
    '222': "Autres frais de gestion (forfait)",
    '223': "Primes d'assurance",
    '224': "Dépenses de réparation, d'entretien",
    '227': "Taxes foncières",
    '250': "Intérêts d'emprunt",
  };

  return Object.entries(byLigne)
    .filter(([_, montant]) => montant > 0)
    .map(([ligne, montant]) => ({
      ligne,
      description: ligneDescriptions[ligne] || ligne,
      montant: montant / 100, // centimes → euros
    }))
    .sort((a, b) => parseInt(a.ligne) - parseInt(b.ligne));
}
```

**IMPORTANT — Audit des catégories existantes :**

Avant d'implémenter ce mapping, l'agent doit :

```bash
# 1. Trouver l'enum ou les catégories de dépenses dans le schema
grep -rn "ExpenseCategory\|category.*enum\|MAINTENANCE\|INSURANCE\|TAX_PROPERTY" prisma/schema.prisma

# 2. Vérifier les valeurs utilisées dans le code
grep -rn "category:" app/api/expenses/ components/expenses/ --include="*.ts" --include="*.tsx" | head -30

# 3. Vérifier si un mapping existe déjà
grep -rn "2044\|ligne.*221\|declaration.*fiscale" lib/ services/ --include="*.ts" | head -20
```

Adapter le mapping ci-dessus aux catégories réelles trouvées dans le code. Ne pas inventer de catégories qui n'existent pas.

### Ligne 222 : Forfait 20€ par lot

La ligne 222 est un forfait de 20€ par local, pas lié aux dépenses saisies. L'ajouter automatiquement dans `aggregateExpensesFor2044` :

```typescript
// Ajouter automatiquement le forfait 20€/lot (ligne 222)
const propertyCount = /* nombre de biens loués du proprio */;
result.push({
  ligne: '222',
  description: "Autres frais de gestion (forfait 20 €/lot)",
  montant: propertyCount * 20,
});
```

### Ligne 250 : Intérêts d'emprunt

Les intérêts d'emprunt ne sont pas une dépense saisie. Ils sont calculés à partir des données d'emprunt sur Property :

```typescript
function calculateYearlyInterest(property: Property, year: number): number {
  if (!property.loanAmount || !property.loanRate || !property.loanStartDate || !property.loanEndDate) {
    return 0;
  }

  // Réutiliser le calcul du simulateur d'investissement
  // InvestmentSimulatorService calcule déjà le tableau d'amortissement
  // avec la répartition capital/intérêts par année.
  // Appeler la même logique ici.

  // OU calcul simplifié si le service n'est pas directement appelable :
  // Tableau d'amortissement standard, extraire les intérêts de l'année demandée
}
```

**Idéal :** importer `InvestmentSimulatorService.projectYearly()` qui génère déjà le tableau d'amortissement avec la colonne intérêts par année.

### Calcul de plus-value fiscalement exact

Réutiliser `InvestmentSimulatorService.calculateCapitalGainTax()` qui existe déjà :

```typescript
// Dans getFinancialReport.ts, pour calculer la plus-value nette :

import { InvestmentSimulatorService } from '@/services/InvestmentSimulatorService';

function calculateNetCapitalGain(property: Property): {
  grossGain: number;
  netGain: number;
  taxIR: number;
  taxPS: number;
  surtax: number;
  holdingYears: number;
} | null {
  if (!property.purchasePrice || !property.estimatedCurrentValue || !property.purchaseDate) {
    return null;
  }

  const holdingYears = differenceInYears(new Date(), property.purchaseDate);

  // Frais de notaire : utiliser le montant saisi ou le forfait fiscal de 7,5%
  const notaryFees = Math.round(property.purchasePrice * 0.075);

  // Travaux : agréger les dépenses catégorisées MAINTENANCE/RENOVATION
  // pour ce bien sur toute la durée de détention.
  // OU utiliser le forfait fiscal de 15% du prix d'achat si détention > 5 ans
  const worksExpenses = await getWorksExpensesForProperty(property.id);
  const worksCost = holdingYears >= 5
    ? Math.max(worksExpenses, Math.round(property.purchasePrice * 0.15)) // forfait 15% si plus avantageux
    : worksExpenses;

  const result = InvestmentSimulatorService.calculateCapitalGainTax({
    purchasePrice: property.purchasePrice,
    notaryFees,
    renovationCost: worksCost,
    resalePrice: property.estimatedCurrentValue,
    holdingYears,
  });

  return {
    grossGain: property.estimatedCurrentValue - property.purchasePrice,
    netGain: result.netGain,
    taxIR: result.taxIR,
    taxPS: result.taxPS,
    surtax: result.surtax,
    holdingYears,
  };
}

/**
 * Récupère le total des dépenses de travaux pour un bien
 * sur toute la durée de détention (catégories MAINTENANCE, RENOVATION, etc.)
 */
async function getWorksExpensesForProperty(propertyId: string): Promise<number> {
  const expenses = await prisma.expense.aggregate({
    where: {
      propertyId,
      category: { in: ['MAINTENANCE', 'RENOVATION', 'PLUMBING', 'ELECTRICITY', 'HEATING'] },
    },
    _sum: { amountCents: true },
  });
  return (expenses._sum.amountCents || 0) / 100;
}
```

**Points critiques du calcul de plus-value :**

1. **Prix de revient** = prix d'achat + frais de notaire (réels ou forfait 7,5%) + travaux (réels ou forfait 15% si > 5 ans de détention, en prenant le plus avantageux)
2. **Abattements IR** (19%) : 0% les 5 premières années, 6%/an de la 6e à la 21e, 4% la 22e → exonération totale après 22 ans
3. **Abattements PS** (17,2%) : 0% les 5 premières années, 1,65%/an de la 6e à la 21e, 1,60% la 22e, 9%/an de la 23e à la 30e → exonération totale après 30 ans
4. **Surtaxe** : si plus-value nette > 50 000€, surtaxe progressive de 2% à 6%
5. **Tout ça est déjà codé** dans `calculateCapitalGainTax`. Ne pas recoder.

### Calcul du rendement net

```typescript
function calculateNetYield(property: Property, yearlyNetResult: number): number | null {
  // Le dénominateur est la valeur du bien (estimée ou prix d'achat à défaut)
  const denominator = property.estimatedCurrentValue || property.purchasePrice;
  if (!denominator || denominator === 0) return null;

  return (yearlyNetResult / denominator) * 100;
}
```

### Calcul du capital restant dû

```typescript
function calculateRemainingDebt(property: Property): number | null {
  if (!property.loanAmount || !property.loanRate || !property.loanStartDate || !property.loanEndDate) {
    return null;
  }

  // Réutiliser le tableau d'amortissement du simulateur
  // qui calcule déjà le capital restant dû à chaque échéance.
  // Trouver l'année en cours et retourner le capital restant.

  // OU calcul direct :
  const totalMonths = differenceInMonths(property.loanEndDate, property.loanStartDate);
  const elapsedMonths = differenceInMonths(new Date(), property.loanStartDate);
  const monthlyRate = (property.loanRate / 100) / 12;

  if (monthlyRate === 0) {
    // Prêt à taux zéro
    return Math.round(property.loanAmount * (1 - elapsedMonths / totalMonths));
  }

  // Formule du capital restant dû après n mensualités
  const remaining = property.loanAmount *
    (Math.pow(1 + monthlyRate, totalMonths) - Math.pow(1 + monthlyRate, elapsedMonths)) /
    (Math.pow(1 + monthlyRate, totalMonths) - 1);

  return Math.max(0, Math.round(remaining));
}
```

### Comparaison placements

Réutiliser `InvestmentSimulatorService.comparePlacements()` :

```typescript
const comparisons = InvestmentSimulatorService.comparePlacements({
  investedAmount: property.purchasePrice, // ou l'apport si on l'a
  years: holdingYears,
});
// Retourne : Livret A (3%), Bourse (7%), Assurance-vie (2%)
```

Les taux de référence sont déjà dans le simulateur. Ne pas les hardcoder ailleurs.

---

## FICHIERS RÉCAPITULATIF

### Nouveaux

| Fichier | Agent | Rôle |
|---------|-------|------|
| `lib/finances/expenseTo2044Mapping.ts` | 3 | Mapping catégories → lignes 2044 |
| `components/finances/DataInviteCard.tsx` | 2 | Card invitation à renseigner une donnée |
| `components/finances/PropertyDataSheet.tsx` | 2 | Bottom sheet de saisie (un champ à la fois) |

### Modifiés

| Fichier | Agent | Modification |
|---------|-------|-------------|
| `prisma/schema.prisma` | 1 | Ajouter champs investissement + emprunt sur Property |
| `app/actions/getFinancialReport.ts` | 3 | Utiliser les services existants pour les calculs |
| `components/finances/InsightCard.tsx` ou équivalent | 2 | Intégrer les DataInviteCards dans le flow d'insights |

---

## VÉRIFICATIONS

### Agent 1
- [ ] Audit schema : `grep` pour trouver les champs existants AVANT d'ajouter
- [ ] Pas de doublons (purchasePrice existe peut-être déjà)
- [ ] Tous les nouveaux champs sont optionnels (?)
- [ ] Migration non-destructive
- [ ] `npx prisma generate` → 0 erreurs

### Agent 2
- [ ] Une seule invitation à la fois (pas 4 formulaires)
- [ ] L'invitation montre ce que ça débloque ("Débloque : Rendement net · Comparatif placements")
- [ ] Bottom sheet avec un seul champ principal (sauf emprunt = 3 groupés)
- [ ] Après validation → la métrique apparaît instantanément (optimistic update)
- [ ] L'invitation disparaît une fois la donnée remplie pour tous les biens
- [ ] Si plusieurs biens sans la donnée : "Appartement Lumineux et 2 autres biens"
- [ ] Style cohérent avec les InsightCards existants (Open Doodle, fond coloré léger)

### Agent 3
- [ ] Mapping couvre TOUTES les catégories de dépenses existantes dans le codebase
- [ ] Catégories non mappées → vérifier la déductibilité et documenter
- [ ] Forfait 20€/lot (ligne 222) ajouté automatiquement
- [ ] Intérêts d'emprunt (ligne 250) calculés depuis les données Property, pas saisis manuellement
- [ ] Plus-value : prix de revient = achat + notaire (7,5% forfait) + travaux (réels ou 15% forfait, le plus avantageux)
- [ ] Plus-value : abattements IR calculés exactement (6%/an 6e-21e, 4% 22e)
- [ ] Plus-value : abattements PS calculés exactement (1,65%/an 6e-21e, 1,60% 22e, 9%/an 23e-30e)
- [ ] Plus-value : surtaxe si > 50 000€
- [ ] `calculateCapitalGainTax` du simulateur réutilisé (pas recodé)
- [ ] `comparePlacements` du simulateur réutilisé
- [ ] Capital restant dû calculé automatiquement (pas de saisie annuelle)
- [ ] Rendement net = résultat net / valeur du bien (estimée ou achat)
- [ ] Données manquantes → null (pas de 0€ trompeur)
- [ ] `npm run build` → 0 erreurs
