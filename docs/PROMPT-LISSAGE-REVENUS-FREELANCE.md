# Feature Lissage Revenus Freelance — Analyse automatique Powens

## Contexte

Les freelances et indépendants se versent leur rémunération par virement de leur compte professionnel vers leur compte personnel. Ce virement est l'équivalent de leur "salaire net" — ce qui reste après charges et impôts. Powens (connexion bancaire) capte ces transactions sur le compte perso du locataire.

**Objectif :** détecter automatiquement les virements provenant du compte professionnel, calculer un revenu mensuel lissé sur 12 mois, et l'afficher dans le Passeport Locatif. Zéro saisie manuelle, zéro manipulation possible par le locataire.

**Philosophie Coridor :** la donnée bancaire brute, vérifiée par Powens, sans possibilité de modification. C'est ce qui donne la crédibilité au système. Le locataire ne peut ni ajouter ni exclure des transactions.

---

## LOGIQUE DE DÉTECTION

### Identifier le compte professionnel

Quand Powens synchronise les comptes bancaires du locataire, il récupère la liste de tous les comptes connectés. Certains sont des comptes courants perso, d'autres des livrets, etc. On ne peut pas se fier au type de compte car les néobanques pro (Shine, Qonto) ne sont pas toujours supportées par Powens.

La détection repose sur les **virements entrants sur le compte perso** :

### Algorithme de détection des virements pro → perso

**Étape 1 — Récupérer toutes les transactions créditrices des 12 derniers mois**

Sur le(s) compte(s) courant(s) du locataire, filtrer :
- Type : crédit (entrée d'argent)
- Catégorie : virement (pas carte, pas prélèvement, pas chèque)
- Montant : > 500€ (seuil minimum pour éliminer les petits remboursements)
- Période : 12 derniers mois glissants

**Étape 2 — Regrouper par émetteur**

Les virements bancaires ont un libellé (label/wording) qui contient des informations sur l'émetteur. Exemples de libellés typiques :

```
"VIR SEPA DUPONT CONSULTING"
"VIREMENT DE SHINE ADRIEN DUPONT"  
"VIR INST QONTO DUPONT ADRIEN"
"VIREMENT RECU DE M DUPONT A"
"VIR DE DUPONT ADRIEN EI"
```

Normaliser les libellés et regrouper les transactions par émetteur.

**Étape 3 — Identifier l'émetteur "compte pro"**

Un émetteur est identifié comme "compte professionnel" s'il remplit TOUS ces critères :

1. **Récurrence** : au moins 3 virements sur les 12 derniers mois (un freelance se verse au minimum trimestriellement)
2. **Montant significatif** : montant moyen > 1 000€ (pas des remboursements entre amis)
3. **C'est l'émetteur principal** : c'est la source de virements récurrents avec le montant cumulé le plus élevé (pour distinguer des virements de la famille)
4. **Le libellé contient des indices pro** : nom de l'utilisateur (match partiel prénom/nom), ou mots-clés néobanques (SHINE, QONTO, BLANK, FINOM, MANAGER.ONE), ou mention EI/EIRL/SASU/SAS/SARL/EURL/MICRO

**Niveaux de confiance :**

- **HIGH** : le libellé contient un mot-clé néobanque pro (SHINE, QONTO, etc.) OU contient une forme juridique (EI, SASU, etc.) ET le nom du locataire
- **MEDIUM** : le libellé contient le nom du locataire ET c'est l'émetteur principal ET récurrence ≥ 3
- **LOW** : récurrence ≥ 3 ET émetteur principal ET montant moyen > 1 000€ mais pas de match sur le nom

Si la confiance est LOW, le système affiche quand même le lissage mais avec une mention "Revenu auto-détecté — vérification en cours" dans le Passeport. Un admin peut vérifier manuellement si nécessaire.

**Cas multiples émetteurs pro :** un freelance peut avoir plusieurs sources (SASU + auto-entreprise, ou deux comptes pro). Si plusieurs émetteurs matchent les critères avec une confiance MEDIUM ou HIGH, prendre tous les émetteurs identifiés et sommer les montants.

### Mots-clés de détection

```typescript
// Néobanques et banques pro courantes en France
const PRO_BANK_KEYWORDS = [
  'SHINE', 'QONTO', 'BLANK', 'FINOM', 'MANAGER.ONE', 'MANAGR',
  'ANYTIME', 'MEMO BANK', 'PROPULSE', 'COMPTE PRO', 'CPT PRO',
];

// Formes juridiques françaises
const LEGAL_FORM_KEYWORDS = [
  'EI', 'EIRL', 'EURL', 'SARL', 'SAS', 'SASU', 'SA',
  'SCI', 'SCM', 'SCP', 'SELARL',
  'MICRO', 'AUTO-ENTREPRENEUR', 'AE',
  'CONSULTING', 'CONSEIL', 'FREELANCE',
];

// Préfixes de virements à ignorer lors de la normalisation
const TRANSFER_PREFIXES = [
  'VIREMENT INSTANTANE', 'VIREMENT SEPA', 'VIREMENT RECU',
  'VIR EUROPEEN', 'VIR INSTANTANE', 'VIR SEPA', 'VIR INST',
  'VIR RECU', 'VIR DE', 'VIREMENT', 'VIR',
];
```

---

## SERVICE

### Créer `services/FreelanceIncomeService.ts`

Le service doit implémenter :

1. **analyzeIncome(userId)** — analyse complète des transactions Powens
   - Récupère les transactions créditrices > 500€ des 12 derniers mois
   - Normalise les libellés (retire préfixes VIR SEPA, références numériques longues, dates)
   - Regroupe par émetteur normalisé
   - Identifie les émetteurs pro (récurrence ≥ 3, montant moyen > 1000€, match nom/néobanque/forme juridique)
   - Calcule le lissage : total 12 mois / 12
   - Calcule le breakdown mensuel
   - Détermine le niveau de confiance global (HIGH > MEDIUM > LOW)

2. **saveAnalysis(userId, analysis)** — persiste le résultat dans TenantProfile

3. **analyzeAndSave(userId)** — combine les deux, appelé après une sync Powens

**Normalisation des libellés :**

```typescript
function normalizeLabel(label: string): string {
  let normalized = label.toUpperCase().trim();
  // Retirer les préfixes de virement (du plus long au plus court)
  for (const prefix of TRANSFER_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.slice(prefix.length).trim();
    }
  }
  // Retirer les références numériques longues (numéros de compte, refs)
  normalized = normalized.replace(/\b[A-Z0-9]{15,}\b/g, '');
  // Retirer les dates dans le libellé
  normalized = normalized.replace(/\b\d{2}\/\d{2}(\/\d{2,4})?\b/g, '');
  // Normaliser les espaces
  normalized = normalized.replace(/\s+/g, ' ').trim();
  return normalized;
}
```

**Match des formes juridiques en mot entier** (pour éviter les faux positifs comme "SA" dans "VERSAILLES") :

```typescript
const hasLegalForm = LEGAL_FORM_KEYWORDS.some(kw => {
  const regex = new RegExp(`\\b${kw}\\b`, 'i');
  return regex.test(labelUpper);
});
```

**Résultat de l'analyse :**

```typescript
interface FreelanceIncomeAnalysis {
  monthlySmoothedIncome: number;    // revenu mensuel lissé (total 12 mois / 12)
  annualIncome: number;             // revenu total sur 12 mois
  sources: IncomeSource[];          // émetteurs identifiés comme pro
  monthlyBreakdown: MonthlyIncome[]; // détail mois par mois
  periodStart: Date;
  periodEnd: Date;
  monthsCovered: number;            // nombre de mois avec des données
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  verifiedAt: Date;
  transactionCount: number;
}

interface MonthlyIncome {
  month: string;        // "2026-01"
  amount: number;
  transactionCount: number;
}

interface IncomeSource {
  normalizedLabel: string;
  transactionCount: number;
  totalAmount: number;
  averageAmount: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}
```

---

## MODÈLE DE DONNÉES

### Nouveaux champs sur TenantProfile

```prisma
model TenantProfile {
  // ... champs existants (netSalary, partnerNetSalary, etc.) ...

  // Revenus freelance lissés (auto-détectés via Powens)
  freelanceSmoothedIncome     Int?       // revenu mensuel lissé en centimes
  freelanceAnnualIncome       Int?       // revenu annuel total en centimes
  freelanceIncomeConfidence   String?    // "HIGH" | "MEDIUM" | "LOW"
  freelanceIncomeVerifiedAt   DateTime?  // date de la dernière analyse
  freelanceIncomeMonths       Int?       // nombre de mois avec données
  freelanceIncomeSources      Json?      // détail des émetteurs détectés
  freelanceIncomeBreakdown    Json?      // breakdown mensuel
}
```

**Note sur les montants :** vérifier si TenantProfile stocke en centimes ou en euros. Adapter le service en conséquence.

---

## DÉCLENCHEMENT DE L'ANALYSE

### Quand analyser ?

**1. Après une synchronisation Powens réussie**

Dans le handler de callback Powens, après import des transactions :

```typescript
const freelanceTypes = ['FREELANCE', 'INDEPENDENT', 'SELF_EMPLOYED', 'AUTO_ENTREPRENEUR', 'BUSINESS_OWNER'];
if (profile && freelanceTypes.includes(profile.employmentType || '')) {
  await FreelanceIncomeService.analyzeAndSave(userId);
}
```

**2. Quand le locataire change son type d'emploi vers freelance/indépendant**

Si des transactions Powens existent déjà, lancer l'analyse immédiatement.

**3. Bouton "Actualiser" dans le Passeport**

Le locataire peut forcer une re-analyse (utile après une nouvelle sync Powens ou un changement de situation).

---

## AFFICHAGE

### Vue locataire — FreelanceIncomeCard dans PassportClient.tsx

Le locataire voit le détail complet de ses revenus détectés :

- Montant lissé en grand (`text-3xl font-bold`)
- Badge "Vérifié Powens" en vert avec icône cadenas
- Mention "Basé sur X mois de transactions vérifiées via connexion bancaire"
- Graphique en barres horizontales : 12 barres (une par mois), montant à droite de chaque barre
- Les mois à 0€ sont affichés (transparence) mais sans barre
- Date de dernière vérification
- Bouton "Actualiser" discret

### Vue propriétaire — TenantProfilePreview / PassportPreview

Le propriétaire voit une version simplifiée :

```
💰 5 200 €/mois (lissé sur 12 mois)
🔒 Vérifié via connexion bancaire
```

Le propriétaire ne voit PAS :
- Le détail mois par mois (confidentialité)
- Les mois à 0€
- Le nom des sources détectées
- Le niveau de confiance

---

## INTÉGRATION AVEC LA SOLVABILITÉ

Pour les freelances, utiliser `freelanceSmoothedIncome` en priorité sur `netSalary` si disponible et confiance ≠ LOW :

```typescript
function getMonthlyIncome(profile: TenantProfile): { amount: number; verified: boolean } {
  if (profile.freelanceSmoothedIncome && profile.freelanceIncomeConfidence !== 'LOW') {
    return { amount: profile.freelanceSmoothedIncome, verified: true };
  }
  if (profile.netSalary) {
    return { amount: profile.netSalary, verified: false };
  }
  return { amount: 0, verified: false };
}
```

Distinguer visuellement un revenu vérifié d'un déclaratif :
- Vérifié : `🔒 5 200 €/mois (vérifié)` avec badge vert
- Déclaratif : `💬 5 200 €/mois (déclaré)` sans badge

---

## API

### GET /api/profile/freelance-income

Retourne l'analyse pour le locataire connecté.

### POST /api/profile/freelance-income/refresh

Force une re-analyse. Réponse : l'analyse mise à jour.

---

## FICHIERS

### Nouveaux fichiers (3)

| Fichier | Rôle |
|---------|------|
| `services/FreelanceIncomeService.ts` | Détection automatique, calcul lissage, sauvegarde |
| `app/api/profile/freelance-income/route.ts` | GET analyse + POST refresh |
| `components/passport/FreelanceIncomeCard.tsx` | Affichage revenus lissés + graphique barres (vue locataire) |

### Fichiers modifiés (5)

| Fichier | Modification |
|---------|-------------|
| `prisma/schema.prisma` | Champs freelance income sur TenantProfile |
| Handler sync Powens | Déclencher l'analyse après sync pour profils freelance |
| `components/passport/PassportClient.tsx` | Intégrer FreelanceIncomeCard |
| `components/inbox/TenantProfilePreview.tsx` | Afficher revenu lissé vérifié (vue proprio simplifiée) |
| `components/passport/PassportPreview.tsx` | Afficher revenu lissé vérifié (vue proprio simplifiée) |

---

## VÉRIFICATIONS

- [ ] Migration Prisma : champs freelance income ajoutés
- [ ] Détection : virements pro → perso identifiés par libellé (néobanque + nom utilisateur)
- [ ] Détection : virements < 500€ ignorés
- [ ] Détection : émetteurs avec < 3 virements ignorés
- [ ] Détection : match mot entier pour formes juridiques (pas "SA" dans "VERSAILLES")
- [ ] Détection : confiance HIGH pour SHINE/QONTO + nom
- [ ] Détection : confiance MEDIUM pour nom seul + récurrence
- [ ] Calcul : revenu lissé = total 12 mois / 12
- [ ] Calcul : breakdown mensuel correct (mois à 0€ inclus)
- [ ] Déclenchement : analyse lancée après sync Powens pour profils freelance
- [ ] Déclenchement : analyse lancée au changement de type d'emploi
- [ ] Sauvegarde : données persistées dans TenantProfile
- [ ] API GET : retourne l'analyse complète
- [ ] API POST refresh : re-analyse et met à jour
- [ ] Vue locataire : montant lissé + graphique barres + date vérification
- [ ] Vue propriétaire : montant lissé + mention "vérifié" uniquement (PAS de détail mensuel)
- [ ] Solvabilité : utilise le revenu lissé vérifié en priorité sur le déclaratif
- [ ] Solvabilité : badge "vérifié" vs "déclaré" visuellement distinct
- [ ] Le locataire ne peut PAS modifier les données détectées
- [ ] Le locataire ne peut PAS ajouter manuellement des transactions
- [ ] npm run build → 0 erreurs
