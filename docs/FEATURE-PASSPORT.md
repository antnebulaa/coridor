# Passeport Locatif — Guide fonctionnel

> Dernière mise à jour : 17 février 2026
> Statut : V1 implémentée
> Documents liés : [Analyse juridique](FEATURE-PASSPORT-LEGAL.md) · [Schéma technique](FEATURE-PASSPORT-SCHEMA.md)

---

## 1. Le concept

Le Passeport Locatif est un **profil de confiance** que le locataire construit au fil de ses locations sur Coridor. Il fonctionne comme un "LinkedIn de la location" : chaque bail, chaque paiement vérifié et chaque évaluation de propriétaire enrichit le profil du locataire.

Le résultat est un **score composite de 0 à 100**, accompagné d'un indice de confiance, que le locataire peut choisir de partager avec les propriétaires lors de ses candidatures.

### Principes fondateurs

- **Opt-in total** : le Passeport est désactivé par défaut. Rien n'est visible sans action explicite du locataire.
- **Contrôle granulaire** : le locataire choisit section par section ce qu'il partage (historique, évaluations, badge payeur, etc.).
- **Pas de badge négatif** : le système ne pénalise jamais un locataire. Soit le badge est affiché ("Payeur vérifié — X mois"), soit il est masqué.
- **Score = privé** : le score composite 0-100 est visible **uniquement** par le locataire. Le propriétaire ne voit que des données factuelles (mois vérifiés, évaluations, historique).
- **Anti-discrimination** : aucun champ de texte libre dans les évaluations. Seuls des critères structurés avec des réponses prédéfinies sont utilisés.
- **Conformité RGPD** : export JSON/PDF (portabilité), consentement explicite par évaluation, droit à l'oubli via masquage/suppression.

---

## 2. Les 4 piliers du score

Le score est calculé par `PassportService.computeScore()` en combinant 4 composantes pondérées :

| Pilier | Poids | Source de données | Ce qui est mesuré |
|--------|-------|-------------------|-------------------|
| **Régularité des paiements** | 40% | Powens (analyse bancaire) | Mois vérifiés (≥ 3 requis) + taux de régularité (% mois payés) |
| **Ancienneté locative** | 20% | Historique des baux | Durée cumulée (plafonnée à 60 mois), bonus pour les baux vérifiés |
| **Évaluations propriétaires** | 25% | Questionnaires structurés (4 critères) | Moyenne pondérée des évaluations (les vérifiées comptent double) |
| **Complétude du dossier** | 15% | Profil locataire | 7 champs vérifiés (emploi, salaire, garants, bio, etc.) |

> **Important** : ce score est **privé** — seul le locataire le voit dans son espace `/account/passport`. Le propriétaire ne voit **jamais** le score numérique.

### Formule détaillée

```
Score Régularité (40%)
  = min(verifiedMonths / 24, 1.0) × 0.6 + regularityRate × 0.4
  Actif uniquement si verifiedMonths ≥ 3
  regularityRate = moisPayés / moisAttendusDansPériode

Score Ancienneté (20%)
  = min(totalMonths / 60, 1.0) × (0.7 + 0.3 × verificationRatio)
  verificationRatio = moisVérifiés / moisTotaux

Score Évaluations (25%)
  = moyennePondérée(compositeScores) / 3
  Les évaluations de baux vérifiés (Coridor) ont un poids de 2×
  Chaque évaluation = moyenne de 4 critères (note 1-3 par critère)

Score Complétude (15%)
  = champsRemplis / 7
  Champs : emploi, salaire, bio, garant, revenu additionnel, photo, téléphone
```

### Indice de confiance

| Niveau | Condition | Signification |
|--------|-----------|---------------|
| **HIGH** | ≥ 3 sources vérifiées | Données fiables, multiples sources croisées |
| **MEDIUM** | 1-2 sources vérifiées | Données partiellement vérifiées |
| **LOW** | 0 source vérifiée | Données essentiellement déclaratives |

Les "sources vérifiées" sont : badge payeur actif, au moins un bail Coridor, au moins une évaluation d'un bail Coridor.

---

## 3. Parcours locataire

### 3.1 Activation du Passeport

Le locataire accède à `/account/passport` depuis la sidebar de son compte. La page affiche :

1. **Jauge circulaire SVG** — Score 0-100 avec animation, badge de confiance
2. **4 barres de sous-scores** — Détail de chaque pilier avec sa pondération
3. **Toggle d'activation** — Active/désactive le Passeport globalement

### 3.2 Historique locatif

L'historique se remplit de deux manières :

**Automatique (source CORIDOR)** : quand un bail est signé via Yousign, le webhook appelle `PassportService.onLeaseSigned()` qui crée une entrée `RentalHistory` avec :
- `source: CORIDOR`
- `isVerified: true`
- Données pré-remplies depuis la chaîne `RentalApplication → Listing → RentalUnit → Property`
- Le locataire ne peut **pas** modifier ces données

**Manuel (source MANUAL)** : le locataire peut ajouter ses anciens logements (hors Coridor) via un formulaire :
- Ville, code postal, type de bien, loyer, dates d'entrée/sortie, nom du propriétaire
- `source: MANUAL`, `isVerified: false`
- Modifiable et supprimable à tout moment

L'historique s'affiche en **timeline verticale** triée par date, avec des badges "Vérifié" (vert) ou "Déclaratif" (gris). Le locataire peut masquer individuellement chaque entrée via un toggle visibilité (oeil).

### 3.3 Réception d'une évaluation

1. Le propriétaire remplit le formulaire d'évaluation (voir section 4)
2. Le locataire reçoit une **notification** l'informant qu'une évaluation a été soumise
3. L'évaluation est **stockée mais invisible** (non partagée) par défaut
4. Le locataire peut consulter l'évaluation et décider de **consentir au partage** ou non
5. Le consentement est individuel par évaluation — le locataire peut accepter certaines et refuser d'autres

### 3.4 Réglages de partage

5 toggles indépendants contrôlent ce qui est visible pour les propriétaires :

| Toggle | Par défaut | Ce qu'il contrôle |
|--------|-----------|-------------------|
| Paiements vérifiés | ✅ Activé | Affichage "Payeur vérifié — X mois" + jauge progressive |
| Historique des baux | ✅ Activé | Timeline des locations passées |
| Évaluations propriétaires | ❌ Désactivé | Notes et pastilles des évaluations |
| Synthèse financière | ❌ Désactivé | Revenus, garants |
| Mois vérifiés | ✅ Activé | Compteur de mois vérifiés via Powens |

### 3.5 Export (portabilité RGPD)

Deux formats disponibles :
- **JSON** — Données structurées complètes (historique, évaluations, scores, settings)
- **PDF** — Document formaté avec le même style que les quittances de loyer (via `@react-pdf/renderer`)

---

## 4. Parcours propriétaire

### 4.1 Évaluation d'un locataire

En fin de bail (ou pendant le bail si ≥ 3 mois de durée), le propriétaire reçoit un lien vers `/passport/review/[rentalHistoryId]`.

Le formulaire contient **4 questions structurées** avec 3 réponses possibles chacune :

| Critère | Question | Positif (3) | Neutre (2) | Négatif (1) |
|---------|----------|-------------|------------|-------------|
| **Régularité des paiements** | Le loyer était-il réglé de manière régulière ? | Toujours dans les temps | Quelques retards ponctuels | Retards fréquents |
| **État du logement** | Dans quel état avez-vous trouvé le logement au départ du locataire ? | Très bon état | Usure normale | Dégradations constatées |
| **Communication** | Comment décririez-vous la communication avec le locataire ? | Réactive et agréable | Correcte | Difficile ou absente |
| **Recommandation** | Recommanderiez-vous ce locataire à un autre propriétaire ? | Oui, sans hésitation | Avec quelques réserves | Non |

**Règles de validation** :
- Le propriétaire doit être le propriétaire du bien lié au bail
- Le bail doit avoir duré au minimum 3 mois
- Une seule évaluation par bail
- Les 4 critères doivent tous être remplis

**Calcul du score composite** :
- POSITIVE = 3 points, NEUTRAL = 2 points, NEGATIVE = 1 point
- Score = somme des 4 notes / 4 (moyenne, affiché /3)

### 4.2 Consultation du Passeport d'un candidat

Quand un propriétaire consulte un candidat (dans la conversation ou le pipeline de candidatures), le composant `PassportPreview` s'affiche automatiquement dans `TenantProfilePreview` si :

1. Le locataire a activé son Passeport (`isEnabled = true`)
2. Le propriétaire possède au moins une propriété

Le preview affiche :
- Badge de confiance (HIGH/MEDIUM/LOW)
- Badge payeur "Payeur vérifié — X mois" avec jauge progressive (si partagé)
- Résumé de l'historique locatif (si partagé)
- Pastilles colorées des évaluations sur 4 critères (si partagées et consenties)

> **Le propriétaire ne voit jamais le score numérique.** Seules des données factuelles sont exposées.

L'API `/api/passport/[userId]` filtre automatiquement selon les réglages du locataire — le propriétaire ne voit **que** ce que le locataire a choisi de montrer.

---

## 5. Architecture technique

### 5.1 Flux de données

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ALIMENTATION                                  │
│                                                                      │
│  Signature bail (Yousign)                                            │
│       │                                                              │
│       ▼                                                              │
│  webhook/yousign ──→ PassportService.onLeaseSigned()                │
│       │                    │                                         │
│       │                    ▼                                         │
│       │              RentalHistory                                   │
│       │              (CORIDOR, verified)                             │
│       │                                                              │
│  Locataire ──→ /account/passport ──→ addManualRentalHistory()       │
│       │                    │                                         │
│       │                    ▼                                         │
│       │              RentalHistory                                   │
│       │              (MANUAL, non-verified)                          │
│       │                                                              │
│  Propriétaire ──→ /passport/review/[id] ──→ submitLandlordReview() │
│                         │                                            │
│                         ▼                                            │
│                   LandlordReview                                     │
│                   + 4 × LandlordReviewScore                         │
│                         │                                            │
│                         ▼                                            │
│                   Notification au locataire                          │
│                         │                                            │
│                         ▼                                            │
│  Locataire ──→ consentToReview() ──→ tenantConsented = true         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        CONSULTATION                                  │
│                                                                      │
│  Locataire ──→ GET /api/passport ──→ getPassport()                  │
│                GET /api/passport/score ──→ computeScore()           │
│                                                                      │
│  Propriétaire ──→ GET /api/passport/[userId] ──→ getVisiblePassport()│
│                   (filtré par PassportSettings + consentements)      │
│                                                                      │
│  Intégration ──→ TenantProfilePreview ──→ <PassportPreview />       │
│                   (dans conversations et pipeline candidatures)      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Modèles de données

| Modèle | Rôle | Relations clés |
|--------|------|----------------|
| `RentalHistory` | Une entrée dans l'historique locatif | → TenantProfile, → RentalApplication? (1:1), → LandlordReview? |
| `LandlordReview` | Évaluation structurée d'un locataire | → RentalHistory (1:1), → User (reviewer), → LandlordReviewScore[] |
| `LandlordReviewScore` | Score individuel par critère | → LandlordReview, @@unique(reviewId + criterion) |
| `PassportSettings` | Préférences de partage du locataire | → TenantProfile (1:1), 5 toggles booléens |

### 5.3 Routes API

| Route | Méthode | Accès | Description |
|-------|---------|-------|-------------|
| `/api/passport` | GET | Locataire | Mon passeport complet |
| `/api/passport/score` | GET | Locataire | Mon score + sous-scores |
| `/api/passport/settings` | PUT | Locataire | Modifier mes préférences de partage |
| `/api/passport/history` | POST | Locataire | Ajouter un bail manuel |
| `/api/passport/history/[id]` | PATCH, DELETE | Locataire | Modifier/supprimer un bail manuel |
| `/api/passport/history/[id]/visibility` | PATCH | Locataire | Masquer/afficher une entrée |
| `/api/passport/[userId]` | GET | Propriétaire | Voir le passeport filtré d'un candidat |
| `/api/passport/review` | POST | Propriétaire | Soumettre une évaluation |
| `/api/passport/review/[id]/consent` | PATCH | Locataire | Consentir au partage d'une évaluation |
| `/api/passport/export` | GET | Locataire | Export JSON ou PDF (`?format=json\|pdf`) |

### 5.4 Fichiers principaux

| Fichier | Rôle |
|---------|------|
| `services/PassportService.ts` | Service métier centralisé (10+ méthodes) |
| `app/[locale]/account/passport/PassportClient.tsx` | Page principale locataire (~550 lignes) |
| `components/passport/PassportPreview.tsx` | Vue compacte pour propriétaires |
| `components/passport/LandlordReviewForm.tsx` | Formulaire d'évaluation 4 critères |
| `app/[locale]/passport/review/[rentalHistoryId]/` | Page standalone pour évaluation |
| `prisma/schema.prisma` | 4 enums + 4 modèles |
| `components/profile/PaymentBadge.tsx` | Badge "Payeur vérifié" avec jauge progressive |
| `services/PaymentVerificationService.ts` | Analyse bancaire (régularité + mois vérifiés) |
| `scripts/backfill-rental-history.ts` | Backfill des baux signés existants en RentalHistory |

### 5.5 Notifications

Quand un propriétaire soumet une évaluation via `submitLandlordReview()`, une notification in-app est automatiquement envoyée au locataire :

- **Type** : `PASSPORT_REVIEW`
- **Message** : *"Vous avez reçu une nouvelle évaluation de votre ancien propriétaire pour votre location à [ville]."*
- **Lien** : `/account/passport`

Le locataire peut ensuite consulter l'évaluation et décider de consentir à son partage.

### 5.6 Backfill des baux existants

Pour les locataires ayant des baux signés sur Coridor avant l'activation du Passeport, un script de backfill est disponible :

```bash
# Vérifier d'abord ce qui sera créé (sans modification)
npx ts-node scripts/backfill-rental-history.ts --dry-run

# Exécuter le backfill
npx ts-node scripts/backfill-rental-history.ts
```

Le script crée une entrée `RentalHistory` (source `CORIDOR`, `isVerified: true`) pour chaque `RentalApplication` au statut `SIGNED` qui n'a pas encore d'entrée associée.

---

## 6. Conformité légale

Le Passeport Locatif a été conçu en respectant les contraintes suivantes (détail complet dans [FEATURE-PASSPORT-LEGAL.md](FEATURE-PASSPORT-LEGAL.md)) :

| Règle | Mise en oeuvre |
|-------|---------------|
| **RGPD art. 6.1.a** (consentement) | Opt-in global + consentement par évaluation |
| **RGPD art. 5.1.c** (minimisation) | Seules les données nécessaires sont collectées |
| **RGPD art. 17** (droit à l'effacement) | Masquage individuel de chaque entrée |
| **RGPD art. 20** (portabilité) | Export JSON et PDF |
| **Anti-discrimination** | Aucun texte libre, critères structurés uniquement |
| **Pas de fichier négatif** | Jamais de badge négatif affiché, score ≥ 0 |
| **Powens/DSP2** | Zéro stockage de données bancaires brutes, seuls les indicateurs (mois vérifiés, taux régularité) sont conservés |

---

## 7. Évolutions futures (V2+)

- Vérification documentaire des baux manuels (upload de quittances passées)
- QR code du Passeport pour partage hors-plateforme
- Intégration DossierFacile pour enrichir la complétude
- Historique d'évolution du score dans le temps (graphique)
- Notification proactive au propriétaire quand un candidat a un Passeport fort
- API publique pour que d'autres plateformes puissent lire le Passeport (avec consentement)
