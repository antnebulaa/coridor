# PROMPT-PASSPORT-PROGRESSIVE-DISCLOSURE.md

> Prompt à copier dans Claude Code pour lancer l'implémentation via Agent Teams
> Coller ce prompt tel quel. Les agents se répartissent le travail automatiquement.

---

## Prompt

```
Implémente le progressive disclosure de la card Passeport Locatif dans le dashboard locataire ("Mon espace"), en suivant la spec FEATURE-PASSPORT-PROGRESSIVE-DISCLOSURE.md.

## Contexte

Le Passeport Locatif est la feature phare de Coridor. Actuellement, il est affiché de la même manière quel que soit le niveau de l'utilisateur. On veut que la card évolue en 4 états selon la complétion : Découverte → En cours → Avancé → Complet. C'est du progressive disclosure inspiré de LinkedIn (profile strength) et Airbnb (Superhost).

## Répartition en 3 teammates

### Teammate 1 — Backend : Calcul de complétion

Fichiers à créer/modifier :
- `lib/passportCompletion.ts` — Nouvelle fonction `computePassportCompletion()`

Spécifications :
1. Crée le type `PassportState = 'discovery' | 'in_progress' | 'advanced' | 'complete'`
2. Crée l'interface `PassportCompletionData` avec : percent, state, earnedBadges, nextStep, remainingSteps, overallScore, percentileRank
3. Crée l'interface `PassportStep` avec : id, label, description, estimatedMinutes, href
4. Crée le type `PassportBadgeType` : VERIFIED_PAYER, IDENTITY_VERIFIED, HISTORY_2Y, HISTORY_5Y, LANDLORD_REFERENCE, PROFESSIONAL_VERIFIED
5. Implémente `computePassportCompletion()` avec les poids suivants :
   - Données bancaires (Powens) : 25% — check `passport?.bankConnectionVerified`
   - Identité vérifiée : 20% — check `user.identityVerified`
   - Historique locatif (1+) : 20% — check `passport?.rentalHistories.length >= 1`
   - Référence bailleur (1+) : 15% — check `passport?.landlordReferences.length >= 1`
   - Infos professionnelles : 10% — check `user.professionalInfo` exists
   - Photo de profil : 5% — check `user.profilePhotoUrl` exists
   - Bio : 5% — check `user.bio` exists
6. Seuils d'état : 0% = discovery, 1-40% = in_progress, 41-74% = advanced, 75%+ = complete
7. `nextStep` : retourne la première étape non complétée dans l'ordre de priorité (bank > identity > history > reference > professional)
8. `remainingSteps` : toutes les étapes non complétées, max 3
9. Badges : VERIFIED_PAYER si bank connectée, IDENTITY_VERIFIED si identité OK, HISTORY_2Y si historique >= 2 ans, etc.
10. `percentileRank` : si moins de 100 locataires actifs, retourner null. Sinon, calculer le percentile réel.

Vérifie les models Prisma existants (TenantPassport, RentalHistory, User) pour adapter les noms de champs.

Écris les tests unitaires dans `__tests__/passportCompletion.test.ts` :
- 0 critères → discovery, 0%
- Bank + identity (45%) → advanced
- Tout sauf photo+bio (90%) → complete
- nextStep retourne la bonne priorité
- Badges corrects

### Teammate 2 — Frontend : Les 4 composants de card

Fichiers à créer :
- `components/passport/PassportCard.tsx` — Switch sur les 4 états
- `components/passport/PassportCardDiscovery.tsx` — État 0
- `components/passport/PassportCardInProgress.tsx` — État 1
- `components/passport/PassportCardAdvanced.tsx` — État 2
- `components/passport/PassportCardComplete.tsx` — État 3
- `components/passport/ProgressRing.tsx` — Composant SVG anneau de progression
- `components/passport/PassportBadge.tsx` — Chip de badge

Design (tous les états) :
- Card fond sombre : `bg-gradient-to-br from-[#1A1A1A] to-[#2D2D2D]`
- Texte blanc, accent #E8A838
- Coins arrondis `rounded-2xl`, padding `p-5`
- Utilise Tailwind pour tout le styling

État 0 — Discovery :
- Icône 🛂, titre "Votre Passeport Locatif", description explicative
- 3 chips bénéfices : "Réponses plus rapides", "Confiance vérifiée", "Candidatures prioritaires" (bg white/10, text white/80)
- CTA bouton pleine largeur, bg accent, texte dark, "Découvrir mon Passeport →"
- AUCUN score, pourcentage, ou badge
- Lien vers `/account/passport`

État 1 — In Progress :
- Label "Passeport Locatif" (muted), titre "Bon début !"
- ProgressRing (52px, stroke 4, accent) avec % au centre
- Barre de progression linéaire (h-1.5, bg white/10, fill accent)
- Section "Prochaine étape" : bg white/6, rounded-lg, label + description + bouton "Faire →"
- Note "🔒 Vos données restent privées et chiffrées" (text white/40, text-center)

État 2 — Advanced :
- Label + titre "Très bon profil"
- ProgressRing avec %
- Ligne de badges (PassportBadge) avec icône ✓ et label
- Zone social proof : "↑ 3× plus de réponses..." (accent bold)
- Liste des étapes restantes (max 2-3) avec cercle vide + label + temps estimé

État 3 — Complete :
- Label "PASSEPORT LOCATIF" uppercase accent
- Score grand : `text-3xl font-bold` pour le chiffre, `/100` en muted
- Icône 🛂 dans cercle gradient doré avec box-shadow glow
- Tous les badges
- Indicateur "⭐ Profil de confiance · Top 15% des locataires" (bg green/10)
- Card background légèrement différent : gradient avec touche dorée

ProgressRing.tsx :
- Props : percent, size (default 56), stroke (default 5), color (default accent)
- SVG circle avec stroke-dasharray/dashoffset
- Animation au montage : transition stroke-dashoffset 0.8s ease

PassportBadge.tsx :
- Props : type (PassportBadgeType), affiche icône + label + couleur selon le type
- Couleurs : VERIFIED_PAYER = vert, IDENTITY_VERIFIED = bleu, HISTORY_* = violet

### Teammate 3 — Intégration dans Mon espace + Hook

Fichiers à créer/modifier :
- `hooks/usePassportCompletion.ts` — Hook qui fetch les données et appelle computePassportCompletion
- Modifier la page dashboard locataire pour intégrer `<PassportCard />`

Hook usePassportCompletion :
1. Récupère le user courant (session)
2. Récupère le TenantPassport avec les relations (rentalHistories, landlordReferences)
3. Appelle `computePassportCompletion(user, passport)`
4. Retourne `{ data: PassportCompletionData, isLoading, error }`
5. Si pas de passport, retourne état discovery
6. Gère le cas où l'utilisateur est propriétaire uniquement (ne pas afficher)

Intégration dashboard :
1. Trouve la page Mon espace / dashboard locataire dans `app/[locale]/account/`
2. Ajoute le hook `usePassportCompletion`
3. Place `<PassportCard />` après les stats rapides (candidatures + RDV) et avant la grille d'accès rapide
4. Si l'utilisateur est proprio uniquement, ne pas rendre la card
5. S'assurer que la card est bien visible above the fold sur mobile

Edge cases à gérer :
- Loading state : skeleton card avec shimmer effect
- Erreur : ne pas afficher la card plutôt qu'un état cassé
- Proprio uniquement : skip
- Données Powens expirées : compter comme non-complété

## Règles communes

- Utilise les conventions du projet existant (imports, structure de fichiers, nommage)
- Utilise Tailwind CSS (pas de CSS modules ou styled-components)
- TypeScript strict
- Vérifie les noms de champs Prisma existants avant de coder
- Ne pas toucher au PassportService existant (services/PassportService.ts) — le calcul de complétion est une NOUVELLE fonction séparée
- Les composants doivent être responsive (mobile first)
- Utilise les composants UI existants du projet quand ils existent (Button, Card, etc.)
```

---

## Comment lancer

Dans Claude Code, colle le prompt ci-dessus. Claude Code va automatiquement :
1. Lire la structure du projet
2. Créer les 3 teammates en parallèle
3. Chaque teammate implémente sa partie
4. Le leader vérifie la cohérence entre les 3

## Fichier de contexte recommandé

Avant de lancer, assure-toi que les fichiers suivants sont accessibles dans le projet :
- `prisma/schema.prisma` (pour les models TenantPassport, User, RentalHistory)
- `services/PassportService.ts` (pour ne pas dupliquer la logique)
- `docs/FEATURE-PASSPORT-PROGRESSIVE-DISCLOSURE.md` (cette spec)
- La page dashboard actuelle (`app/[locale]/account/dashboard/` ou similaire)
