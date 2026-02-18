# Simulateur Fiscal Propriétaire — Résumé d'implémentation

> Dernière mise à jour : 18 février 2026
> Statut : V1 implémentée
> Document lié : [Spec fonctionnelle et technique](FEATURE-TAX-SIMULATOR.md)

---

## 1. Ce que fait le simulateur

Le simulateur fiscal permet au propriétaire de **comparer les régimes fiscaux** applicables à ses revenus locatifs et d'estimer l'imposition nette (IR + prélèvements sociaux) pour choisir le régime le plus avantageux.

### Régimes comparés

| Type de location | Régime 1 | Régime 2 |
|-----------------|----------|----------|
| **Location nue** | Micro-foncier (abattement 30%) | Réel 2044 (charges déductibles + déficit foncier) |
| **Location meublée** | Micro-BIC (abattement 50%) | Réel LMNP (charges + amortissement) |

Le propriétaire peut saisir des biens **nus et meublés simultanément** — le simulateur agrège par type et calcule les 4 régimes en parallèle.

### Fonctionnalités clés

- Calcul IR marginal (différence d'IR avec/sans revenus locatifs) pour plus de précision
- Gestion complète du **déficit foncier** : plafond 10 700 €/an sur revenu global, intérêts d'emprunt exclus, report 10 ans
- **Amortissement LMNP** : ne crée pas de déficit, excédent reporté sans limite de durée
- **Détection LMP** : alerte si les seuils de loueur professionnel sont atteints (> 23 000 € et > autres revenus)
- **Pré-remplissage** : charge automatiquement les biens du propriétaire depuis Coridor (loyers, charges via FiscalService)
- Feature-gated : accessible aux plans **Essentiel** et **Pro** uniquement

---

## 2. Parcours utilisateur

```
                    ┌──────────────────┐
                    │  /account/       │
                    │  tax-simulator   │
                    └────────┬─────────┘
                             │
              ┌──────────────▼──────────────┐
              │        ÉTAT SAISIE           │
              │                              │
              │  Situation du foyer :        │
              │    • Revenus annuels         │
              │    • Nombre de parts         │
              │                              │
              │  Biens locatifs (dynamique): │
              │    • Type: Nue / Meublée     │
              │    • Loyers annuels          │
              │    • Charges (accordéon)     │
              │    • Amortissements (meublé) │
              │                              │
              │  [Charger depuis Coridor]    │
              │  [+ Ajouter un bien]         │
              │  [Calculer →]                │
              └──────────────┬──────────────┘
                             │ POST /api/tax-simulator
                             │
              ┌──────────────▼──────────────┐
              │       ÉTAT RÉSULTAT          │
              │                              │
              │  ★ Régime optimal + économie │
              │                              │
              │  Cards côte à côte :         │
              │    • Base imposable          │
              │    • IR estimé               │
              │    • Prélèvements sociaux    │
              │    • Total imposition        │
              │    • Taux effectif           │
              │                              │
              │  ⚠️ Alertes (LMP, déficit)   │
              │  📋 Disclaimer obligatoire   │
              │  [← Modifier les données]    │
              └─────────────────────────────┘
```

---

## 3. Architecture technique

### 3.1 Fichiers créés

| Fichier | Rôle |
|---------|------|
| `lib/fiscalRules.ts` | Constantes fiscales 2025-2026 sourcées légalement (barème IR, PS, seuils micro, déficit, LMP) |
| `services/TaxSimulatorService.ts` | Service stateless avec 8 méthodes de calcul |
| `app/api/tax-simulator/route.ts` | POST (simulation) + GET (pré-remplissage) |
| `app/[locale]/account/tax-simulator/page.tsx` | Page serveur |
| `app/[locale]/account/tax-simulator/TaxSimulatorClient.tsx` | Interface complète (679 lignes) |

### 3.2 Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `components/account/AccountSidebar.tsx` | Ajout lien "Simulateur fiscal" (LANDLORD only) |
| `components/account/AccountClientLayout.tsx` | Ajout titre dans PAGE_TITLES |
| `prisma/seed-plans.ts` | Ajout feature `TAX_SIMULATOR` |
| `lib/features.ts` | Ajout `TAX_SIMULATOR` aux legacy maps PLUS et PRO |

### 3.3 Constantes fiscales (lib/fiscalRules.ts)

Toutes les constantes sont commentées avec leur source légale. Mise à jour annuelle requise.

| Constante | Valeur | Source |
|-----------|--------|--------|
| Barème IR 2026 | 5 tranches (0% → 45%) | PLF 2026, art. 2 |
| PS revenus fonciers | 17,2% | CSS (CSG 9,2% + CRDS 0,5% + solidarité 7,5%) |
| PS BIC LMNP | 17,2% (conservateur) | LFSS 2026 — flou juridique sur 18,6% mentionné dans l'UI |
| Seuil micro-foncier | 15 000 € | CGI art. 32 |
| Abattement micro-foncier | 30% | CGI art. 32 |
| Seuil micro-BIC | 77 700 € | CGI art. 50-0 |
| Abattement micro-BIC | 50% | CGI art. 50-0 |
| Déficit foncier plafond | 10 700 €/an | CGI art. 156-I-3° |
| Report déficit | 10 ans | CGI art. 156-I-3° |
| Seuil LMP | 23 000 € + > autres revenus | CGI art. 155 IV |

### 3.4 Service de calcul (TaxSimulatorService.ts)

| Méthode | Description |
|---------|-------------|
| `simuler(input)` | Point d'entrée — agrège par type, lance tous les calculs, génère les alertes |
| `calculerMicroFoncier()` | Base = 70% loyers, IR marginal + PS 17,2% |
| `calculerReelFoncier()` | Charges complètes, déficit foncier (hors intérêts sur revenu global), report |
| `calculerMicroBIC()` | Base = 50% recettes, IR marginal + PS 17,2% |
| `calculerReelLMNP()` | Charges + amortissement (plafonné au résultat avant amortissement), report excédent |
| `calculerIR()` | Barème progressif avec quotient familial |
| `detecterLMP()` | Alerte si 2 conditions cumulatives (seuil + > autres revenus) |
| `determinerRegimeOptimal()` | Compare totalImposition des régimes éligibles |

### 3.5 API (app/api/tax-simulator/route.ts)

| Méthode | Description | Auth | Feature gate |
|---------|-------------|------|-------------|
| `POST` | Exécute la simulation | Oui | `TAX_SIMULATOR` |
| `GET` | Pré-remplit les biens depuis Coridor (Property → FiscalService) | Oui | `TAX_SIMULATOR` |

Le GET charge les propriétés de l'utilisateur et utilise `FiscalService.generateFiscalSummary()` pour pré-remplir les charges réelles (taxe foncière, assurance, travaux, copropriété, frais de gestion).

---

## 4. Feature flag

- **Clé** : `TAX_SIMULATOR`
- **Catégorie** : `FINANCE`
- **Plans** : Essentiel, Pro (pas Free)
- **Gate côté serveur** : `hasFeature(userId, 'TAX_SIMULATOR')` dans l'API
- **Gate côté client** : `<FeatureGate featureKey="TAX_SIMULATOR">` dans TaxSimulatorClient

---

## 5. Points d'attention

### Mentions obligatoires dans l'UI

L'écran de résultat affiche systématiquement :
1. "Simulation indicative — ne constitue pas un conseil fiscal"
2. "Barème IR 2026 (revenus 2025)"
3. "Consultez un expert-comptable pour votre situation personnelle"

### PS BIC LMNP : flou juridique

Le taux de 18,6% (CSG à 10,6% LFSS 2026) pour les BIC meublés fait l'objet d'un débat. Le simulateur utilise 17,2% par défaut (position conservatrice). À confirmer avec la doctrine fiscale.

### Réintégration amortissements (LF 2025)

Depuis le 14/02/2025, les amortissements LMNP déduits sont réintégrés dans le calcul de la plus-value à la revente. Le simulateur affiche une alerte informative pour les utilisateurs en réel LMNP. Le calcul de plus-value lui-même est hors scope V1.

### Mise à jour annuelle

Le fichier `lib/fiscalRules.ts` doit être mis à jour chaque année après promulgation de la loi de finances. Les constantes à vérifier :
- Barème IR (tranches et taux)
- Taux de prélèvements sociaux
- Seuils micro-foncier et micro-BIC
- Plafond déficit foncier

---

## 6. Évolutions V2+

- Calcul de la plus-value à la revente (avec réintégration amortissements LMNP)
- Projection pluriannuelle (simulation 5-10 ans avec report déficit/amortissement)
- Comparaison nu vs meublé pour un même bien
- Export PDF de la simulation
- Intégration Loc'Avantages et dispositifs incitatifs
- Statut bailleur privé (si adopté)
