# Patch — Intégration revenu lissé freelance dans le dossier locataire

## Contexte actuel

Le dossier locataire (`/account/tenant-profile`) contient un formulaire avec un champ **"Salaire Net Mensuel (€)"** — un simple input numérique que le locataire remplit à la main. Ce montant déclaratif est stocké dans `TenantProfile.netSalary`.

Ce champ `netSalary` est ensuite utilisé dans :
- **TenantProfilePreview** (le résumé du dossier candidat visible par le propriétaire dans la conversation) — section "Synthèse financière" avec le calcul de solvabilité (ratio revenus/loyer)
- **Le récapitulatif financier** en bas de la page dossier (tableau Salaire Net + Garants + Total)
- **L'analyse automatique du dossier** dans le pipeline candidatures (éligibilité GLI, solvabilité)

**Problème :** avec le lissage freelance, on a maintenant deux sources de revenus :
1. `netSalary` — déclaratif, modifiable à la main, non vérifié
2. `freelanceSmoothedIncome` — calculé automatiquement par Powens, non modifiable, vérifié

Si les deux coexistent sans lien, le propriétaire ne sait pas lequel croire, et le locataire ne comprend pas lequel est utilisé. Il faut une seule source de vérité visible.

---

## CE QU'IL FAUT MODIFIER

### 1. Le champ "Salaire Net Mensuel" dans le formulaire du dossier

Quand le lissage freelance est actif (les 3 conditions réunies : profil freelance/indépendant + Powens connecté + `freelanceSmoothedIncome` non null + confiance ≠ LOW), le champ input "Salaire Net Mensuel" doit être **remplacé** par un affichage verrouillé :

**État normal (pas de lissage actif) :**

```
Salaire Net Mensuel (€)
┌────────────────────────────────────────┐
│  1500                                € │
└────────────────────────────────────────┘
```

Input éditable, comme aujourd'hui. Aucun changement.

**État lissage actif :**

```
Salaire Net Mensuel
┌────────────────────────────────────────────────────────┐
│                                                        │
│  🔒  5 200 €/mois              Vérifié via Powens     │
│      Lissé sur 12 mois de transactions bancaires       │
│                                                        │
└────────────────────────────────────────────────────────┘
Calculé automatiquement à partir de vos virements bancaires.
Ce montant remplace la saisie manuelle.
```

- L'input disparaît, remplacé par un bloc en lecture seule
- Fond légèrement vert/émeraude (`bg-emerald-50 border-emerald-200`) pour signifier "vérifié"
- Icône cadenas
- Badge "Vérifié via Powens"
- Texte explicatif en dessous en `text-xs text-neutral-500`
- Le locataire ne peut PAS modifier ce montant
- Si le locataire déconnecte Powens ou si la détection échoue, le champ redevient un input éditable avec l'ancien `netSalary` pré-rempli

### 2. Le récapitulatif financier en bas de page

Le tableau récapitulatif utilise actuellement `netSalary`. Il doit utiliser le revenu lissé quand disponible :

**Sans lissage :**
```
Salaire Net (Vous)        1 500 €
Salaire Net (Conjoint·e)      0 €
Total Garants             2 000 €
```

**Avec lissage :**
```
Revenu lissé (Vous) 🔒    5 200 €    ← remplace "Salaire Net"
Salaire Net (Conjoint·e)      0 €
Total Garants             2 000 €
```

Le libellé change de "Salaire Net (Vous)" à "Revenu lissé (Vous)" avec l'icône cadenas, pour que le locataire comprenne la source.

### 3. TenantProfilePreview (vue propriétaire dans la conversation)

C'est le composant clé — c'est ce que le propriétaire voit quand il consulte le dossier d'un candidat dans la messagerie.

**Actuellement :** il affiche `netSalary` dans la synthèse financière.

**Après modification :** il utilise la même logique de priorité :

```typescript
// Dans TenantProfilePreview ou la server action qui prépare les données
const incomeDisplay = getIncomeDisplay(profile);

function getIncomeDisplay(profile: TenantProfile): {
  amount: number;
  label: string;
  verified: boolean;
} {
  // Priorité 1 : revenu freelance lissé vérifié
  if (
    profile.freelanceSmoothedIncome &&
    profile.freelanceIncomeConfidence &&
    profile.freelanceIncomeConfidence !== 'LOW'
  ) {
    return {
      amount: profile.freelanceSmoothedIncome,
      label: 'Revenu mensuel lissé',
      verified: true,
    };
  }

  // Priorité 2 : salaire déclaré
  return {
    amount: profile.netSalary || 0,
    label: 'Salaire net mensuel',
    verified: false,
  };
}
```

**Affichage propriétaire — revenu vérifié :**

```
Synthèse financière
──────────────────────────────
💰 Revenu mensuel lissé     5 200 €  🔒 Vérifié
👫 Conjoint·e                    0 €
🛡️ Garants                  2 000 €
──────────────────────────────
📊 Revenus totaux           7 200 €
🏠 Loyer demandé              850 €
✅ Taux d'effort              11,8%    Excellent
```

**Affichage propriétaire — revenu déclaratif (pas de Powens) :**

```
Synthèse financière
──────────────────────────────
💰 Salaire net mensuel      1 500 €  💬 Déclaré
👫 Conjoint·e                    0 €
🛡️ Garants                  2 000 €
──────────────────────────────
📊 Revenus totaux           3 500 €
🏠 Loyer demandé              850 €
⚠️ Taux d'effort              24,3%   Correct
```

La distinction visuelle est importante :
- **Vérifié** : badge vert `🔒 Vérifié`, inspire confiance
- **Déclaré** : badge neutre `💬 Déclaré`, le propriétaire sait que ce n'est pas vérifié

### 4. Calcul de solvabilité partout dans l'app

Chaque endroit qui utilise `netSalary` pour calculer la solvabilité doit être mis à jour pour utiliser la logique de priorité. Les endroits à vérifier :

- `TenantProfilePreview.tsx` — synthèse financière dans la conversation
- `ScorecardSheet.tsx` — analyse automatique du dossier dans le pipeline (éligibilité GLI, solvabilité)
- `getApplications.ts` — si la solvabilité est pré-calculée côté serveur
- Tout composant ou service qui lit `profile.netSalary` pour du calcul financier

**Créer une fonction utilitaire centralisée** pour ne pas dupliquer la logique :

```typescript
// lib/income.ts
export function getVerifiedIncome(profile: {
  netSalary?: number | null;
  freelanceSmoothedIncome?: number | null;
  freelanceIncomeConfidence?: string | null;
}): { amount: number; verified: boolean; label: string } {
  if (
    profile.freelanceSmoothedIncome &&
    profile.freelanceIncomeConfidence &&
    profile.freelanceIncomeConfidence !== 'LOW'
  ) {
    return {
      amount: profile.freelanceSmoothedIncome,
      verified: true,
      label: 'Revenu mensuel lissé',
    };
  }

  return {
    amount: profile.netSalary || 0,
    verified: false,
    label: 'Salaire net mensuel',
  };
}
```

Remplacer tous les accès directs à `profile.netSalary` par `getVerifiedIncome(profile)` dans les calculs de solvabilité.

### 5. Mise à jour de netSalary quand le lissage est actif

Option à décider : est-ce qu'on **écrase** `netSalary` avec le montant lissé, ou est-ce qu'on garde les deux séparément ?

**Recommandation : garder les deux séparément.** Ne pas écraser `netSalary`. Le locataire a saisi un montant manuellement, on le garde comme fallback. Le `freelanceSmoothedIncome` vit dans ses propres champs. La logique de priorité dans `getVerifiedIncome()` décide lequel afficher. Si le locataire déconnecte Powens un jour, son ancien `netSalary` est toujours là.

---

## FICHIERS À MODIFIER

| Fichier | Modification |
|---------|-------------|
| Page dossier locataire (le composant qui contient l'input "Salaire Net Mensuel") | Conditionner l'affichage : input éditable si pas de lissage, bloc verrouillé si lissage actif |
| Récapitulatif financier (même page) | Utiliser `getVerifiedIncome()` au lieu de `netSalary` direct |
| `lib/income.ts` | **Nouveau** — fonction utilitaire `getVerifiedIncome()` |
| `components/inbox/.../TenantProfilePreview.tsx` | Utiliser `getVerifiedIncome()`, afficher badge Vérifié/Déclaré |
| `components/applications/ScorecardSheet.tsx` | Utiliser `getVerifiedIncome()` pour l'analyse solvabilité |
| Tout autre fichier qui lit `profile.netSalary` pour du calcul financier | Remplacer par `getVerifiedIncome()` |

---

## VÉRIFICATIONS

- [ ] Freelance + Powens connecté + lissage actif : le champ salaire est verrouillé, affiche le montant lissé avec badge vert
- [ ] Freelance + Powens connecté + confiance LOW : le champ salaire reste éditable (fallback déclaratif)
- [ ] Salarié CDI (pas freelance) : le champ salaire reste éditable, aucun changement
- [ ] Freelance + Powens déconnecté : le champ salaire redevient éditable avec l'ancien netSalary
- [ ] Récapitulatif financier : affiche "Revenu lissé (Vous) 🔒" au lieu de "Salaire Net (Vous)" quand lissage actif
- [ ] TenantProfilePreview (vue propriétaire) : affiche le montant lissé avec badge "Vérifié" quand disponible
- [ ] TenantProfilePreview (vue propriétaire) : affiche le montant déclaré avec badge "Déclaré" sinon
- [ ] Solvabilité : calculée sur le revenu lissé quand disponible, pas sur netSalary
- [ ] ScorecardSheet : utilise getVerifiedIncome() pour l'analyse automatique
- [ ] Le locataire ne peut PAS modifier le montant lissé
- [ ] netSalary n'est PAS écrasé — les deux valeurs coexistent en base
- [ ] npm run build → 0 erreurs
