# FEATURE-PASSPORT-PROGRESSIVE-DISCLOSURE.md

> Spec technique : Progressive disclosure de la card Passeport Locatif dans "Mon espace"
> Date : 19 février 2026
> Statut : À implémenter

---

## 1. Contexte & Objectif

Le Passeport Locatif est la feature différenciante de Coridor. Actuellement, il est affiché de manière identique quel que soit le niveau de complétion de l'utilisateur — y compris pour un nouvel inscrit qui ne sait pas ce que c'est.

**Problème** : Un nouvel utilisateur qui voit "Score : 0/100" ou une card vide ne comprend pas la valeur du Passeport et ne s'engage pas.

**Solution** : Implémenter un progressive disclosure inspiré de LinkedIn (profile strength meter, +55% de complétion) et Airbnb (Superhost — le badge n'est montré qu'une fois le contexte compris). La card évolue visuellement selon 4 états de complétion.

**Principe clé** : Ne jamais montrer un système de scoring à quelqu'un qui ne comprend pas encore ce qu'il mesure.

---

## 2. Les 4 états de la card

### État 0 — Découverte (complétion 0%)

**Condition** : `passportCompletionPercent === 0` OU `!hasStartedPassport`

**Contenu affiché** :
- Icône 🛂
- Titre : "Votre Passeport Locatif"
- Description : "Prouvez votre fiabilité aux propriétaires — sans CV, sans discrimination. Vos données parlent pour vous."
- 3 chips de bénéfices : "Réponses plus rapides", "Confiance vérifiée", "Candidatures prioritaires"
- CTA : "Découvrir mon Passeport →" (bouton accent, lien vers la page Passeport)

**Ce qu'on NE montre PAS** : Aucun score, aucun pourcentage, aucune checklist, aucun badge.

**Style** : Card dark (gradient #1A1A1A → #2D2D2D), texte blanc, CTA accent (#E8A838). Glow subtil en background.

---

### État 1 — En cours (complétion 1-40%)

**Condition** : `passportCompletionPercent > 0 && passportCompletionPercent <= 40`

**Contenu affiché** :
- Label : "Passeport Locatif"
- Message d'encouragement : "Bon début !"
- Anneau de progression (ProgressRing) avec pourcentage au centre
- Barre de progression linéaire en dessous
- Section "Prochaine étape" : UNE SEULE action à faire (la plus impactante non complétée), avec bouton "Faire →"
- Note de confiance : "🔒 Vos données restent privées et chiffrées"

**Ce qu'on NE montre PAS** : Score /100, liste complète des étapes, badges, classement.

**Logique "Prochaine étape"** : Prioriser dans cet ordre :
1. Connecter données bancaires (Powens) — si `!hasBankConnection`
2. Vérifier identité — si `!hasIdentityVerified`
3. Ajouter historique locatif — si `rentalHistoryCount === 0`
4. Ajouter référence bailleur — si `landlordReferenceCount === 0`
5. Compléter informations professionnelles — si `!hasProfessionalInfo`

**Style** : Card dark, anneau accent, bouton accent compact.

---

### État 2 — Avancé (complétion 41-74%)

**Condition** : `passportCompletionPercent > 40 && passportCompletionPercent <= 74`

**Contenu affiché** :
- Label : "Passeport Locatif"
- Message : "Très bon profil"
- Anneau de progression avec pourcentage
- Badges gagnés (affichés en chips colorés) :
  - "✓ Payeur vérifié" (vert) — si `hasBadge('VERIFIED_PAYER')`
  - "✓ Identité confirmée" (bleu) — si `hasBadge('IDENTITY_VERIFIED')`
  - "✓ Historique 2+ ans" (violet) — si `hasBadge('HISTORY_2Y')`
- Social proof : "↑ 3× plus de réponses en moyenne pour les locataires avec un Passeport au-dessus de 70%"
- Étapes restantes (max 2-3) avec temps estimé : "Ajouter une référence · 5 min"

**Ce qu'on NE montre PAS** : Score /100, classement "Top X%".

**Style** : Card dark, badges avec background semi-transparent, social proof en accent.

---

### État 3 — Complet (complétion 75%+)

**Condition** : `passportCompletionPercent >= 75`

**Contenu affiché** :
- Label : "PASSEPORT LOCATIF" (uppercase, accent)
- Score grand format : "85" + "/100" (muted)
- Icône 🛂 dans un cercle doré avec glow
- Tous les badges gagnés
- Indicateur de confiance : "⭐ Profil de confiance · Top 15% des locataires sur Coridor"

**Ce qu'on montre maintenant** : Tout — le score a du sens parce que l'utilisateur comprend chaque point.

**Style** : Card dark premium, gradient avec touche dorée, glow effect sur l'icône, visuellement récompensant.

**Calcul "Top X%"** : Basé sur le percentile réel parmi tous les locataires ayant un Passeport > 0%. Si < 100 locataires actifs, ne pas afficher le percentile (pas assez significatif).

---

## 3. Calcul du pourcentage de complétion

Le pourcentage est calculé côté service (`PassportService`) selon les poids suivants :

| Critère | Poids | Condition |
|---------|-------|-----------|
| Données bancaires connectées (Powens) | 25% | `hasBankConnection === true` |
| Identité vérifiée | 20% | `hasIdentityVerified === true` |
| Historique locatif (1+ entrée) | 20% | `rentalHistoryCount >= 1` |
| Référence bailleur (1+ référence) | 15% | `landlordReferenceCount >= 1` |
| Informations professionnelles | 10% | `hasProfessionalInfo === true` |
| Photo de profil | 5% | `hasProfilePhoto === true` |
| Bio / description | 5% | `hasBio === true` |

**Score total = somme des poids des critères complétés.**

> Note : Ce pourcentage de complétion est distinct du "score de confiance" affiché à l'état 3 (qui est le TenantPassport.overallScore calculé par le PassportService existant).

---

## 4. Architecture technique

### Fichiers à créer / modifier

```
lib/passportCompletion.ts          # Calcul du % de complétion + état courant
components/passport/
  PassportCard.tsx                  # Composant parent (switch sur l'état)
  PassportCardDiscovery.tsx         # État 0
  PassportCardInProgress.tsx        # État 1
  PassportCardAdvanced.tsx          # État 2
  PassportCardComplete.tsx          # État 3
  ProgressRing.tsx                  # Composant anneau SVG réutilisable
  PassportBadge.tsx                 # Composant chip de badge
```

### Types

```typescript
// lib/passportCompletion.ts

type PassportState = 'discovery' | 'in_progress' | 'advanced' | 'complete';

interface PassportCompletionData {
  percent: number;                     // 0-100
  state: PassportState;
  earnedBadges: PassportBadgeType[];
  nextStep: PassportStep | null;       // null si complet
  remainingSteps: PassportStep[];      // max 3
  overallScore: number | null;         // score de confiance (null si < 75%)
  percentileRank: number | null;       // null si pas assez de data
}

interface PassportStep {
  id: string;
  label: string;
  description: string;
  estimatedMinutes: number;
  href: string;                        // lien vers l'action
}

type PassportBadgeType = 
  | 'VERIFIED_PAYER' 
  | 'IDENTITY_VERIFIED' 
  | 'HISTORY_2Y' 
  | 'HISTORY_5Y'
  | 'LANDLORD_REFERENCE'
  | 'PROFESSIONAL_VERIFIED';
```

### Fonction de calcul

```typescript
// lib/passportCompletion.ts

export function computePassportCompletion(user: User, passport: TenantPassport | null): PassportCompletionData {
  const criteria = [
    { weight: 25, met: !!passport?.bankConnectionVerified },
    { weight: 20, met: !!user.identityVerified },
    { weight: 20, met: (passport?.rentalHistoryCount ?? 0) >= 1 },
    { weight: 15, met: (passport?.landlordReferenceCount ?? 0) >= 1 },
    { weight: 10, met: !!user.professionalInfo },
    { weight: 5,  met: !!user.profilePhotoUrl },
    { weight: 5,  met: !!user.bio },
  ];

  const percent = criteria.reduce((sum, c) => sum + (c.met ? c.weight : 0), 0);

  const state: PassportState = 
    percent === 0 ? 'discovery' :
    percent <= 40 ? 'in_progress' :
    percent <= 74 ? 'advanced' : 'complete';

  // ... compute badges, nextStep, remainingSteps, percentileRank
  return { percent, state, earnedBadges, nextStep, remainingSteps, overallScore, percentileRank };
}
```

### Composant principal

```typescript
// components/passport/PassportCard.tsx

export function PassportCard({ completionData }: { completionData: PassportCompletionData }) {
  switch (completionData.state) {
    case 'discovery':
      return <PassportCardDiscovery />;
    case 'in_progress':
      return <PassportCardInProgress data={completionData} />;
    case 'advanced':
      return <PassportCardAdvanced data={completionData} />;
    case 'complete':
      return <PassportCardComplete data={completionData} />;
  }
}
```

### Intégration dans Mon espace

```typescript
// Dans la page dashboard / Mon espace

const { data: completionData } = usePassportCompletion(userId);

return (
  <div className="space-y-4">
    {/* Header + stats */}
    <PassportCard completionData={completionData} />
    {/* Quick actions + rest of dashboard */}
  </div>
);
```

### API Route (optionnel — si calcul serveur)

Si le calcul du percentile nécessite une requête DB lourde, ajouter une route :

```
GET /api/passport/completion → PassportCompletionData
```

Sinon, calculer côté client avec les données déjà fetchées du user + passport.

---

## 5. Design tokens

```typescript
// Couleurs utilisées dans les 4 états de la card

const passportCardTokens = {
  // Card background (tous les états)
  cardBg: 'linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%)',
  cardBgComplete: 'linear-gradient(135deg, #1A1A1A 0%, #2A2520 50%, #2D2D2D 100%)',
  
  // Accent
  accent: '#E8A838',
  accentLight: '#FFF5E0',
  
  // Badges
  badgeVerifiedPayer: { color: '#3BA55D', bg: 'rgba(59,165,93,0.15)' },
  badgeIdentity: { color: '#4A8FE7', bg: 'rgba(74,143,231,0.15)' },
  badgeHistory: { color: '#8B6CC1', bg: 'rgba(139,108,193,0.15)' },
  
  // Text on dark
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.7)',
  textTertiary: 'rgba(255,255,255,0.4)',
  
  // Interactive
  chipBg: 'rgba(255,255,255,0.1)',
  stepBg: 'rgba(255,255,255,0.06)',
  stepBgHover: 'rgba(255,255,255,0.1)',
};
```

---

## 6. Edge cases

| Cas | Comportement |
|-----|-------------|
| Utilisateur proprio uniquement (pas locataire) | Ne pas afficher la card Passeport |
| Données Powens expirées / déconnectées | Compter comme non-complété, afficher alerte "Reconnectez vos données bancaires" |
| Score de confiance = 0 mais complétion > 75% | Afficher état "complete" mais sans score /100 (en attente de calcul) |
| Moins de 100 locataires actifs (beta) | Ne pas afficher "Top X%" — remplacer par "Profil de confiance" sans percentile |
| Utilisateur revient après longue absence | Si completion a changé (ex: Powens expiré), recalculer et potentiellement rétrograder l'état |

---

## 7. Animations

- **Transition entre états** : Pas d'animation au changement d'état (se fait entre sessions). L'état est calculé au chargement.
- **ProgressRing** : Animation au montage — `stroke-dashoffset` transition 0.8s ease depuis 0% vers la valeur réelle.
- **Badges** : Apparition avec `fadeIn` + léger `scale` au premier affichage après gain d'un nouveau badge.
- **CTA hover** : Scale 1.02 + ombre légère.

---

## 8. Tests

### Unit tests (lib/passportCompletion.ts)

- `computePassportCompletion` avec 0 critères remplis → state 'discovery', percent 0
- Avec bank + identity (45%) → state 'advanced'
- Avec tout sauf photo et bio (90%) → state 'complete'
- `nextStep` retourne la bonne étape prioritaire
- Badges corrects selon les conditions

### Component tests

- `PassportCard` rend le bon sous-composant selon l'état
- `PassportCardDiscovery` n'affiche aucun score ni pourcentage
- `PassportCardInProgress` affiche UNE seule prochaine étape
- `PassportCardAdvanced` affiche les badges gagnés
- `PassportCardComplete` affiche le score /100

---

## 9. Métriques de succès

| Métrique | Baseline actuelle | Cible |
|----------|-------------------|-------|
| Taux de clic sur la card Passeport | À mesurer | +40% |
| Taux de complétion Passeport (>75%) | À mesurer | +30% vs contrôle |
| Temps entre inscription et 1er badge | À mesurer | < 48h |
| Taux d'abandon à chaque étape | À mesurer | < 20% par étape |
