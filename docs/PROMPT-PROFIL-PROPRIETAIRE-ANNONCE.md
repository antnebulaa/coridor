# Feature Profil Propriétaire sur les Annonces

## Contexte

Sur Coridor, les locataires sont anonymisés (pseudonymes fun) pour lutter contre la discrimination. Les propriétaires, eux, sont visibles — comme sur Airbnb. Ça humanise l'annonce, rassure le locataire ("je sais à qui j'ai affaire"), et crée une asymétrie logique : le locataire est protégé parce qu'il est en position de vulnérabilité, le propriétaire est visible parce qu'il est en position de choix.

**Modèle Airbnb :** prénom + initiale, photo, indicateurs de confiance, bouton contacter.

**Informations affichées :** Prénom + initiale du nom uniquement. Le nom complet n'est révélé qu'à la signature du bail (obligation légale).

---

## ORGANISATION EN TEAM AGENTS

### Agent 1 — Backend (Service, API, Prisma, Cron)

**Mission :** Créer le service LandlordProfileService (profil public, calcul des stats, formatage), modifier le schéma Prisma, créer le cron de refresh des stats, adapter les API listings pour inclure les données proprio.

**Fichiers à produire/modifier :**
- `services/LandlordProfileService.ts` — **Nouveau**
- `prisma/schema.prisma` — Champs profil public sur User
- `app/api/cron/refresh-landlord-stats/route.ts` — **Nouveau**
- `vercel.json` — Ajouter le cron
- `app/api/listings/[listingId]/route.ts` — Include owner dans le GET
- `app/api/listings/route.ts` — Include owner mini dans la liste

### Agent 2 — Frontend Composants (Cards, Avatar, Upload)

**Mission :** Créer les composants visuels : card profil complète pour la page annonce, version mini pour les cards de recherche, avatar réutilisable (photo ou initiales colorées + point vert activité), upload photo de profil, champ bio.

**Fichiers à produire :**
- `components/listing/LandlordProfileCard.tsx` — **Nouveau**
- `components/listing/LandlordProfileMini.tsx` — **Nouveau**
- `components/profile/LandlordAvatar.tsx` — **Nouveau**
- `components/profile/AvatarUpload.tsx` — **Nouveau**

### Agent 3 — Intégration (Pages, branchements, settings)

**Mission :** Intégrer les composants dans les pages existantes : sidebar de la page annonce, cards de recherche, header messagerie, page paramètres du profil proprio (upload photo + bio).

**Fichiers à modifier :**
- `app/[locale]/listings/[listingId]/page.tsx` — Intégrer LandlordProfileCard
- `components/listing/ListingCard.tsx` — Intégrer LandlordProfileMini
- `components/messaging/ConversationHeader.tsx` — Utiliser LandlordAvatar
- `app/[locale]/profile/settings/page.tsx` (ou page profil proprio) — Ajouter AvatarUpload + Bio

---

## AGENT 1 — BACKEND

### Modifications Prisma

Ajouter les champs de profil public sur User (vérifier ce qui existe déjà, ajouter uniquement ce qui manque) :

```prisma
model User {
  // ... champs existants ...

  // Profil public propriétaire
  avatarUrl             String?   // URL photo de profil (Cloudinary)
  bio                   String?   // Courte description (max 200 caractères)
  averageResponseTime   Int?      // temps de réponse moyen en minutes (calculé)
  responseRate          Int?      // taux de réponse en % (calculé)
  lastActiveAt          DateTime? // dernière activité sur la plateforme
}
```

### LandlordProfileService.ts

Le service doit implémenter :

**1. getPublicProfile(landlordId)** — récupère et formate le profil public :
- Prénom + initiale du nom (JAMAIS le nom complet)
- Avatar URL
- Bio
- Nombre de biens actifs (count sur Property where ownerId + status ACTIVE)
- Ancienneté (mois depuis createdAt)
- Temps de réponse moyen formaté
- Taux de réponse
- Indicateur actif (lastActiveAt < 7 jours)

**2. refreshStats(landlordId)** — recalcule les statistiques :
- Temps de réponse moyen : sur les messages reçus dans les 90 derniers jours, pour chaque message reçu trouver la première réponse du proprio, calculer le delta. Ignorer les réponses après 7 jours (considérées comme non-réponses).
- Taux de réponse : (messages ayant reçu une réponse dans les 7 jours / total messages reçus) × 100
- Met à jour `averageResponseTime`, `responseRate`, `lastActiveAt`

**3. formatResponseTime(minutes)** — formatte pour l'affichage :
- < 60 min → "Répond en général en X min"
- < 120 min → "Répond en général en 1h"
- < 1440 min → "Répond en général en Xh"
- < 2880 min → "Répond en général en 1 jour"
- sinon → "Répond en général en X jours"

### Cron refresh stats quotidien

Créer `app/api/cron/refresh-landlord-stats/route.ts` :
- Vérifier le token cron Vercel (`authorization: Bearer CRON_SECRET`)
- Récupérer tous les propriétaires actifs dans les 90 derniers jours
- Appeler `LandlordProfileService.refreshStats()` pour chacun
- Retourner le nombre de profils mis à jour

Ajouter dans `vercel.json` :
```json
{
  "path": "/api/cron/refresh-landlord-stats",
  "schedule": "0 3 * * *"
}
```

### API listings — Include owner

**GET /api/listings/[listingId]** — ajouter l'include des données proprio publiques :

```typescript
owner: {
  select: {
    id: true,
    firstName: true,
    lastName: true, // on n'envoie que l'initiale côté client
    avatarUrl: true,
    bio: true,
    createdAt: true,
    lastActiveAt: true,
    averageResponseTime: true,
    responseRate: true,
  },
},
```

**IMPORTANT :** Ne JAMAIS envoyer le nom complet, l'email, le téléphone ou l'adresse du propriétaire dans cette API publique.

**GET /api/listings** (liste) — ajouter un include minimal :

```typescript
owner: {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    avatarUrl: true,
    averageResponseTime: true,
  },
},
```

Pas de bio ni de stats complètes dans la liste — seulement ce qui est nécessaire pour LandlordProfileMini.

Également inclure le count des biens actifs du propriétaire si possible (via `_count` ou une requête séparée).

---

## AGENT 2 — FRONTEND COMPOSANTS

### LandlordProfileCard.tsx — Card complète page annonce

Affichée dans la sidebar de la page annonce (desktop) ou en section pleine largeur (mobile).

```
┌──────────────────────────────────────────┐
│                                          │
│     ┌──────┐                             │
│     │  📸  │   Christian R.              │
│     │      │   Sur Coridor depuis 2025   │
│     └──────┘                             │
│                                          │
│  💬  Répond en général en 2h             │
│  🏠  3 biens sur Coridor                 │
│  ✅  Taux de réponse : 95%               │
│                                          │
│  « Propriétaire attentif, je m'occupe    │
│    bien de mes locataires. »             │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │        Contacter Christian →       │  │
│  └────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

**Props :**

```typescript
interface LandlordProfileCardProps {
  landlord: {
    id: string;
    firstName: string;
    lastInitial: string;
    avatarUrl?: string | null;
    bio?: string | null;
    propertyCount: number;
    averageResponseTime?: number | null;
    responseRate?: number | null;
    memberSince: Date;
    isActive: boolean;
  };
  onContact: () => void;
}
```

**Spécifications visuelles :**

- Conteneur : `rounded-2xl border border-neutral-200 bg-white p-6`
- Avatar : `LandlordAvatar` composant avec `size="lg"` (64px)
- Nom : `text-lg font-semibold text-neutral-900` — "Christian R."
- Sous-titre : `text-sm text-neutral-500` — "Sur Coridor depuis 2025"
- Stats : icônes Lucide React (`MessageCircle`, `Home`, `CheckCircle`) + texte `text-sm text-neutral-700`, espacement `gap-2`
- Bio : `text-sm text-neutral-600 italic` — entre guillemets français « », affichée seulement si renseignée
- Bouton contacter : `w-full rounded-xl bg-neutral-900 text-white py-3 text-sm font-medium hover:bg-neutral-800`
- Point vert d'activité : via `LandlordAvatar` prop `isActive`

**Affichage conditionnel :**

- Temps de réponse : affiché seulement si calculé (au moins 5 messages reçus)
- Taux de réponse : affiché seulement si > 0 et au moins 5 messages reçus
- Nombre de biens : toujours affiché (minimum 1)
- Bio : affichée seulement si renseignée
- Nouveau proprio (< 1 mois, pas de stats) : badge "🆕 Nouveau sur Coridor" au lieu des stats

### LandlordProfileMini.tsx — Version compacte pour cards de recherche

```
┌────┐
│ 📸 │ Christian R. · 💬 ~2h · 🏠 3
└────┘
```

- Avatar mini : `LandlordAvatar` avec `size="sm"` (32px)
- Texte sur une ligne : nom + temps de réponse abrégé + nombre de biens
- `text-xs text-neutral-500`
- Pas de bio, pas de bouton contacter

### LandlordAvatar.tsx — Composant avatar réutilisable

```typescript
interface LandlordAvatarProps {
  avatarUrl?: string | null;
  firstName: string;
  lastInitial: string;
  size?: 'sm' | 'md' | 'lg';   // sm=32px, md=48px, lg=64px
  isActive?: boolean;           // point vert
}
```

**Si photo :** image ronde avec `object-cover`

**Si pas de photo :** cercle avec initiales (première lettre prénom + initiale nom → "CR"), couleur de fond déterministe basée sur un hash du nom :

```typescript
const colors = [
  'bg-amber-100 text-amber-700',
  'bg-orange-100 text-orange-700',
  'bg-rose-100 text-rose-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
];

function getAvatarColor(name: string): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}
```

**Point vert (actif) :** `absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white`

### AvatarUpload.tsx — Upload photo de profil

```
┌──────────────────────────────────────────┐
│                                          │
│  Photo de profil                         │
│                                          │
│        ┌──────────┐                      │
│        │          │                      │
│        │    CR    │   [ Modifier ]       │
│        │          │                      │
│        └──────────┘                      │
│                                          │
│  Votre photo est visible par les         │
│  locataires sur vos annonces.            │
│                                          │
└──────────────────────────────────────────┘
```

- Click "Modifier" → sélecteur de fichier (`accept: image/jpeg, image/png, image/webp`)
- Preview avant upload
- Upload vers Cloudinary → URL stockée dans `user.avatarUrl`
- Compression : max 500×500px, qualité 80
- API : `POST /api/profile/avatar` ou via une route existante

---

## AGENT 3 — INTÉGRATION

### Page annonce — sidebar

Intégrer `LandlordProfileCard` dans la sidebar droite de `app/[locale]/listings/[listingId]/page.tsx` :

**Desktop — ordre dans la sidebar :**
1. Prix / Loyer / Bouton Postuler
2. **Profil propriétaire (LandlordProfileCard)** ← nouveau
3. Critères / préférences simplifiées (si définies)

**Mobile :**
La card profil propriétaire est une section pleine largeur, placée après la description et avant les critères.

Les données du propriétaire viennent de l'include ajouté par Agent 1 dans l'API listing. Formater côté client :

```typescript
const landlordData = {
  ...listing.property.owner,
  lastInitial: listing.property.owner.lastName?.charAt(0) || '',
  displayName: `${listing.property.owner.firstName} ${listing.property.owner.lastName?.charAt(0)}.`,
  propertyCount: listing.property.owner._count?.properties || 1,
  memberSince: listing.property.owner.createdAt,
  isActive: listing.property.owner.lastActiveAt
    ? Date.now() - new Date(listing.property.owner.lastActiveAt).getTime() < 7 * 24 * 60 * 60 * 1000
    : false,
};
```

### Cards de recherche — ListingCard.tsx

Ajouter `LandlordProfileMini` en bas de chaque `ListingCard`. Les données proprio viennent de l'include mini ajouté par Agent 1 dans l'API liste.

### Messagerie — ConversationHeader.tsx

Le header de conversation côté locataire utilise déjà le nom du propriétaire. S'assurer qu'il utilise `LandlordAvatar` avec le point vert d'activité, pour cohérence visuelle avec la page annonce.

### Page paramètres profil proprio

Ajouter deux sections dans la page de paramètres/profil du propriétaire :

**Section 1 — Photo de profil :**
Composant `AvatarUpload` avec le texte "Votre photo est visible par les locataires sur vos annonces."

**Section 2 — Bio :**
```
┌──────────────────────────────────────────┐
│  À propos de vous                        │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Propriétaire attentif, je          │  │
│  │ m'occupe bien de mes locataires.   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  142 / 200 caractères                    │
│                                          │
│  Ce texte est visible par les            │
│  locataires sur vos annonces.            │
└──────────────────────────────────────────┘
```

- Textarea, max 200 caractères
- Compteur en temps réel
- Placeholder : "Présentez-vous en quelques mots aux futurs locataires..."
- Sauvegarde via API existante (PATCH profil) ou nouvelle route
- Affiché en italique et entre guillemets français « » sur l'annonce

---

## FICHIERS RÉCAPITULATIF

### Nouveaux (6)

| Fichier | Agent | Rôle |
|---------|-------|------|
| `services/LandlordProfileService.ts` | 1 | Profil public, stats, formatage |
| `app/api/cron/refresh-landlord-stats/route.ts` | 1 | Cron quotidien recalcul stats |
| `components/listing/LandlordProfileCard.tsx` | 2 | Card complète page annonce |
| `components/listing/LandlordProfileMini.tsx` | 2 | Version compacte cards recherche |
| `components/profile/LandlordAvatar.tsx` | 2 | Avatar réutilisable (photo ou initiales + point vert) |
| `components/profile/AvatarUpload.tsx` | 2 | Upload photo de profil |

### Modifiés (7)

| Fichier | Agent | Modification |
|---------|-------|-------------|
| `prisma/schema.prisma` | 1 | Champs profil public sur User |
| `vercel.json` | 1 | Ajouter cron refresh-landlord-stats |
| `app/api/listings/[listingId]/route.ts` | 1 | Include owner dans GET |
| `app/api/listings/route.ts` | 1 | Include owner mini dans la liste |
| `app/[locale]/listings/[listingId]/page.tsx` | 3 | Intégrer LandlordProfileCard sidebar |
| `components/listing/ListingCard.tsx` | 3 | Intégrer LandlordProfileMini |
| `app/[locale]/profile/settings/page.tsx` | 3 | Sections AvatarUpload + Bio |

---

## VÉRIFICATIONS

### Agent 1
- [ ] Migration Prisma : nouveaux champs ajoutés
- [ ] LandlordProfileService.getPublicProfile : retourne prénom + initiale (jamais le nom complet)
- [ ] LandlordProfileService.refreshStats : temps de réponse et taux calculés correctement
- [ ] Cron : s'exécute, refresh les stats des proprios actifs
- [ ] API listing détail : inclut les données proprio publiques
- [ ] API listing détail : ne retourne JAMAIS nom complet, email, téléphone, adresse
- [ ] API listing liste : inclut les données proprio mini

### Agent 2
- [ ] LandlordProfileCard : affiche prénom + initiale, avatar, bio entre « », stats, bouton contacter
- [ ] LandlordProfileCard : badge "Nouveau sur Coridor" si < 1 mois
- [ ] LandlordProfileCard : stats masquées si données insuffisantes
- [ ] LandlordProfileMini : version compacte sur une ligne
- [ ] LandlordAvatar : photo si disponible, initiales colorées sinon
- [ ] LandlordAvatar : couleur déterministe (même nom = même couleur)
- [ ] LandlordAvatar : point vert si actif dans les 7 derniers jours
- [ ] AvatarUpload : upload fonctionne, preview, compression 500×500

### Agent 3
- [ ] Page annonce desktop : card proprio dans la sidebar après prix/postuler
- [ ] Page annonce mobile : card proprio pleine largeur après description
- [ ] ListingCard : LandlordProfileMini affiché en bas
- [ ] ConversationHeader : utilise LandlordAvatar
- [ ] Paramètres proprio : sections AvatarUpload + Bio fonctionnelles
- [ ] Bio : limite 200 caractères, compteur en temps réel
- [ ] Mobile : tous les composants responsive
- [ ] Dark mode : tous les composants
- [ ] npm run build → 0 erreurs
