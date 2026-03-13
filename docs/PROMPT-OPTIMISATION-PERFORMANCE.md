# Optimisation Performance — Coridor

## Contexte

L'app met systématiquement 1 à 2 secondes de skeleton à chaque navigation, même en revenant sur une page déjà visitée. L'audit a identifié 3 causes racines :

1. **Région Vercel US East** → +150ms de latence par requête pour les utilisateurs français
2. **87 `router.refresh()`** → chaque mutation re-fetch toute la page serveur
3. **Zéro `<Suspense>` boundary** → le rendu est bloqué jusqu'à la dernière requête Prisma

Ce prompt corrige tout dans l'ordre de priorité : les fixes rapides d'abord (config), puis les fixes structurels (Suspense, requêtes), puis le nettoyage systémique (router.refresh, ClientOnly).

**Résultat attendu :** navigation quasi instantanée entre les pages, FCP dashboard < 500ms, envoi de message sans lag visible.

---

## ORGANISATION EN TEAM AGENTS

### Agent 1 — Config & Infra (30 min, gros impact immédiat)

**Mission :** Appliquer les fixes de configuration qui ne nécessitent aucun refactoring.

### Agent 2 — Requêtes Prisma & Suspense (2h, impact significatif)

**Mission :** Paralléliser les requêtes séquentielles, alléger les includes, ajouter des Suspense boundaries sur les pages principales.

### Agent 3 — Nettoyage router.refresh() & navigation (4h, amélioration systémique)

**Mission :** Remplacer les `router.refresh()` les plus fréquents par des mises à jour optimistic, migrer les `router.push()` vers `<Link>`, supprimer les `ClientOnly` inutiles.

---

## AGENT 1 — CONFIG & INFRA

### 1.1 Région Vercel → Paris

Créer ou modifier `vercel.json` à la racine :

```json
{
  "regions": ["cdg1"]
}
```

Si `vercel.json` existe déjà (pour les crons), ajouter `"regions"` au même niveau. Ne pas écraser les crons existants.

**Impact :** -100 à 150ms sur CHAQUE requête serveur. Pour une page avec 5 requêtes Prisma, c'est 500-750ms gagnées d'un coup.

### 1.2 next.config.ts — Cache client + optimisation bundles

Modifier `next.config.ts` pour ajouter :

```typescript
experimental: {
  optimizePackageImports: ['react-icons', 'lucide-react', 'recharts'],
  staleTimes: {
    dynamic: 30,   // Pages dynamiques cachées 30s côté client
    static: 300,   // Pages statiques cachées 5min côté client
  },
},
```

**Explication `staleTimes` :** quand le proprio navigue Dashboard → Finances → Dashboard, le retour sur Dashboard sera instantané (servi depuis le cache client) pendant 30 secondes. Plus de skeleton pour un simple aller-retour. Le cache est invalidé après 30s ou sur un `router.refresh()` explicite.

**Explication `optimizePackageImports` :** `lucide-react` et `recharts` sont importés dans de nombreux fichiers. Sans cette option, le bundler inclut l'intégralité de la librairie même si on n'utilise que 10 icônes. Avec, seuls les modules utilisés sont bundlés. Gain estimé : 50-100KB.

**IMPORTANT :** ne pas toucher à `ignoreBuildErrors: true` dans ce prompt — c'est un chantier séparé qui risque de casser le build.

### 1.3 Vérification Agent 1

- [ ] `vercel.json` contient `"regions": ["cdg1"]`
- [ ] `staleTimes` configuré dans `next.config.ts`
- [ ] `lucide-react` et `recharts` dans `optimizePackageImports`
- [ ] Les crons existants dans `vercel.json` ne sont pas écrasés
- [ ] `npm run build` → 0 erreurs

---

## AGENT 2 — REQUÊTES PRISMA & SUSPENSE

### 2.1 Calendar — Promise.all() (FIX CRITIQUE)

Fichier : `app/actions/getLandlordCalendarData.ts`

Actuellement les 6 requêtes sont séquentielles. Les wrapper dans `Promise.all()` :

```typescript
// ❌ AVANT (séquentiel — 600-1200ms)
const visitSlots = await prisma.visitSlot.findMany({...});
const properties = await prisma.property.findMany({...});
const visits = await prisma.visit.findMany({...});
const inspections = await prisma.inspection.findMany({...});
const rentTrackings = await prisma.rentPaymentTracking.findMany({...});
const legalReminders = await prisma.legalReminder.findMany({...});

// ✅ APRÈS (parallèle — 100-200ms)
const [visitSlots, properties, visits, inspections, rentTrackings, legalReminders] = await Promise.all([
  prisma.visitSlot.findMany({...}),
  prisma.property.findMany({...}),
  prisma.visit.findMany({...}),
  prisma.inspection.findMany({...}),
  prisma.rentPaymentTracking.findMany({...}),
  prisma.legalReminder.findMany({...}),
]);
```

**Impact :** la page calendrier passe de 1000-1500ms à 200-400ms.

### 2.2 Properties — Alléger les includes

Fichier : `app/actions/getProperties.ts`

Problèmes identifiés :
- `owner: true` charge TOUTES les colonnes de l'owner (mot de passe hashé compris si présent)
- `images: true` sans `take` charge TOUTES les images de chaque propriété
- 4 niveaux d'include (Property → RentalUnit → Listing → Applications → Financials)

```typescript
// ❌ AVANT
include: {
  owner: true,
  images: true,
  rooms: { include: { images: true } },
  rentalUnits: {
    include: {
      images: true,
      targetRoom: { include: { images: true } },
      listings: {
        include: {
          applications: { include: { financials: true } }
        }
      }
    }
  }
}

// ✅ APRÈS
include: {
  images: {
    take: 5,
    orderBy: { order: 'asc' },
    select: { id: true, url: true, thumbnailUrl: true },
  },
  rentalUnits: {
    select: {
      id: true,
      listings: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          price: true,
          status: true,
          _count: { select: { applications: true } },
        },
        take: 1,
      },
    },
  },
}
```

**Règles :**
- Jamais `include: true` sur une relation — toujours un `select` explicite
- `images` : `take: 5` max, seulement `url` et `thumbnailUrl`
- `owner` : supprimer complètement (le proprio c'est l'utilisateur courant, on a déjà ses données)
- `rooms` : supprimer si pas affiché sur la page properties
- `applications` : remplacer par un `_count` (on veut le nombre, pas les détails)

**ATTENTION :** avant de modifier, vérifier quels champs sont réellement utilisés dans le composant client qui consomme ces données. Grep les props utilisées dans le composant PropertyCard ou équivalent. Ne supprimer que les données non utilisées.

### 2.3 Conversations — Réduire la profondeur d'include

Fichier : `app/actions/getConversations.ts`

5 niveaux d'include actuellement. Pour la liste des conversations (sidebar/inbox), on n'a besoin que de :
- Nom de l'autre participant
- Dernier message (preview)
- Nom du bien
- Statut (non-lu, etc.)

```typescript
// ✅ Select minimal pour la liste des conversations
select: {
  id: true,
  updatedAt: true,
  users: {
    select: { id: true, firstName: true, lastName: true, image: true },
  },
  messages: {
    take: 1,
    orderBy: { createdAt: 'desc' },
    select: { content: true, createdAt: true, senderId: true, seen: true },
  },
  listing: {
    select: {
      id: true,
      title: true,
      rentalUnit: {
        select: {
          property: {
            select: { title: true, city: true },
          },
        },
      },
    },
  },
}
```

**ATTENTION :** vérifier que `getConversations` n'est pas aussi utilisé pour la page de détail d'une conversation (qui a besoin de plus de données). Si c'est le cas, créer une version allégée `getConversationsList()` pour la sidebar et garder la version complète pour le détail.

### 2.4 Dashboard query #5 — Réduire l'include

Fichier : `app/actions/getOperationalStats.ts` (ou équivalent)

La query qui charge Property → RentalUnits → Listings → Applications → CandidateScope → CreatorUser + Financials + RentPaymentTrackings est trop large.

Analyser ce que le dashboard affiche réellement :
- Nombre de candidatures en attente → `_count` suffit
- Loyers en retard → une query dédiée `rentPaymentTracking.findMany({ where: { status: 'OVERDUE' }})` est plus efficace
- Biens vacants → `property.count({ where: { /* pas de bail actif */ }})` suffit

Remplacer la mega-query par des queries ciblées en `Promise.all()`.

### 2.5 Ajouter des Suspense boundaries

Pour chaque page principale, séparer le contenu statique (immédiat) du contenu dynamique (streamé).

**Pattern à appliquer :**

```typescript
// app/[locale]/dashboard/page.tsx

// ✅ APRÈS — avec Suspense
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div>
      {/* Partie statique — affichée immédiatement */}
      <DashboardHeader />

      {/* Partie dynamique — streamée */}
      <Suspense fallback={<KPISkeleton />}>
        <DashboardKPIs />
      </Suspense>

      <Suspense fallback={<PropertyListSkeleton />}>
        <DashboardPropertyList />
      </Suspense>

      <Suspense fallback={<ActionsSkeleton />}>
        <DashboardActions />
      </Suspense>
    </div>
  );
}

// Chaque sous-composant est un async Server Component qui fait ses propres requêtes :
async function DashboardKPIs() {
  const stats = await getOperationalStats(userId);
  return <KPICards stats={stats} />;
}

async function DashboardPropertyList() {
  const properties = await getProperties(userId);
  return <PropertyGrid properties={properties} />;
}
```

**Pages à traiter (par priorité) :**

1. **Dashboard** — Header immédiat → Suspense KPIs + Suspense Properties + Suspense Actions
2. **Finances** — Header + QuickLinks immédiats → Suspense ResultCard + Suspense Timeline + Suspense 2044
3. **Properties** — Header + filtres immédiats → Suspense PropertyGrid
4. **Calendar** — Header + navigation date immédiats → Suspense EventsList

**Règle :** le fallback de chaque `<Suspense>` doit être le skeleton existant (les `loading.tsx` contiennent déjà les bons skeletons — les extraire en composants réutilisables si nécessaire).

**IMPORTANT :** pour que Suspense fonctionne avec le streaming, les sous-composants doivent être des **async Server Components** (pas des Client Components qui font un fetch). Si le composant actuel est un Client Component qui reçoit les données en props, il faut refactorer : créer un async Server Component wrapper qui fait la requête et passe les données au Client Component.

### 2.6 Vérifications Agent 2

- [ ] Calendar : `Promise.all()` wrappant les 6 requêtes
- [ ] Properties : plus de `include: true`, toujours `select` explicite
- [ ] Properties : images limitées à `take: 5`
- [ ] Properties : `owner` supprimé de l'include
- [ ] Properties : applications remplacées par `_count`
- [ ] Conversations : select minimal pour la liste (5 niveaux → 3)
- [ ] Dashboard : `<Suspense>` boundaries avec fallback skeleton
- [ ] Finances : `<Suspense>` boundaries avec fallback skeleton
- [ ] Properties : `<Suspense>` boundary avec fallback skeleton
- [ ] Calendar : `<Suspense>` boundary avec fallback skeleton
- [ ] Les skeletons existants (loading.tsx) sont réutilisés dans les fallbacks
- [ ] Aucune régression fonctionnelle — les pages affichent les mêmes données
- [ ] `npm run build` → 0 erreurs

---

## AGENT 3 — NETTOYAGE ROUTER.REFRESH() & NAVIGATION

### 3.1 Stratégie de remplacement des router.refresh()

L'objectif n'est PAS de supprimer tous les 87 `router.refresh()` — certains sont légitimes. L'objectif est de remplacer ceux qui sont dans des chemins critiques fréquents.

**Les 5 fichiers prioritaires (impact maximal) :**

| Fichier | Occurrences | Utilisé à chaque | Remplacement |
|---------|-------------|-------------------|-------------|
| `ConversationClient.tsx` | 6 | Message envoyé | Optimistic update local |
| `SaveListingMenu.tsx` | 5 | Ajout/retrait favori | Toggle local + mutate API |
| `LandlordCalendarClient.tsx` | 4 | Action visite | Mise à jour locale du state |
| `TenantProfileClient.tsx` | 3 | Sauvegarde profil | Toast de confirmation |
| `CommutePreferences.tsx` | 3 | Changement trajet | Mise à jour locale |

**Pattern de remplacement :**

```typescript
// ❌ AVANT — coûte 500ms-2s à chaque action
const handleSendMessage = async (content: string) => {
  await axios.post(`/api/messages`, { content, conversationId });
  router.refresh(); // re-fetch TOUTE la page
};

// ✅ APRÈS — instantané
const handleSendMessage = async (content: string) => {
  // 1. Optimistic update : ajouter le message localement immédiatement
  setMessages(prev => [...prev, {
    id: crypto.randomUUID(), // ID temporaire
    content,
    senderId: currentUser.id,
    createdAt: new Date().toISOString(),
    seen: false,
    _optimistic: true,
  }]);

  // 2. Envoyer au serveur en background
  try {
    const response = await axios.post(`/api/messages`, { content, conversationId });
    // 3. Remplacer le message optimistic par le vrai
    setMessages(prev => prev.map(m =>
      m._optimistic ? { ...response.data, _optimistic: false } : m
    ));
  } catch (error) {
    // 4. Rollback si erreur
    setMessages(prev => prev.filter(m => !m._optimistic));
    toast.error("Erreur d'envoi");
  }
};
```

**Pour les favoris (SaveListingMenu.tsx) :**

```typescript
// ❌ AVANT
const handleToggleFavorite = async () => {
  await axios.post(`/api/favorites/${listingId}`);
  router.refresh();
};

// ✅ APRÈS
const [isFavorited, setIsFavorited] = useState(initialIsFavorited);

const handleToggleFavorite = async () => {
  setIsFavorited(!isFavorited); // Optimistic toggle
  try {
    await axios.post(`/api/favorites/${listingId}`);
  } catch {
    setIsFavorited(isFavorited); // Rollback
    toast.error("Erreur");
  }
};
```

**Règle générale :** si l'action ne change que l'élément sur lequel l'utilisateur a cliqué (un message, un favori, un statut), la mise à jour optimistic locale suffit. Si l'action change des données sur d'autres parties de la page (ex: annuler une visite change le calendrier ET les stats), un `router.refresh()` peut être justifié — mais uniquement après un délai de 2-3 secondes (lazy refresh).

### 3.2 Remplacer router.push() par Link

**Fichiers prioritaires :**

**UserMenu.tsx** — les items du dropdown menu qui naviguent vers des pages :
```typescript
// ❌ AVANT
<MenuItem onClick={() => router.push('/dashboard')}>Dashboard</MenuItem>

// ✅ APRÈS
<Link href="/dashboard"><MenuItem>Dashboard</MenuItem></Link>
```

**ListingCard.tsx** — le clic sur une card annonce :
```typescript
// ❌ AVANT
<div onClick={() => router.push(`/listings/${id}`)}>

// ✅ APRÈS
<Link href={`/listings/${id}`} className="block">
```

Le `<Link>` de Next.js prefetch la page au hover/visibility — quand l'utilisateur clique, la navigation est quasi instantanée.

**EmptyState.tsx** — les CTAs des états vides :
```typescript
// ❌ AVANT
<Button onClick={() => router.push('/listings/new')}>

// ✅ APRÈS
<Link href="/listings/new"><Button>...</Button></Link>
```

### 3.3 Supprimer les ClientOnly inutiles

Le composant `ClientOnly` force un cycle de render supplémentaire (mount → rerender). Il est utile pour éviter les erreurs d'hydratation quand un composant utilise `window` ou `document` au render initial. Mais pour les pages account/ qui sont déjà des Client Components purs, il est inutile.

**Approche :**

```bash
# Lister tous les usages de ClientOnly
grep -rn "ClientOnly" app/ components/ --include="*.tsx" -l
```

Pour chaque fichier :
1. Vérifier si le composant enfant utilise `window`, `document`, `navigator`, `localStorage`, ou `matchMedia` au render
2. Si OUI → garder `ClientOnly`
3. Si NON → supprimer le wrapper `ClientOnly`

**Ne pas supprimer** ClientOnly sur :
- Les composants qui lisent `localStorage` (thème, préférences)
- Les composants qui utilisent `matchMedia` (responsive conditionnel)
- Les composants avec des libs browser-only (mapbox-gl, etc.)

**Supprimer** ClientOnly sur :
- Les pages account/ qui sont déjà des Client Components
- Les composants qui font juste un fetch API dans un useEffect
- Les composants déjà wrappés dans `'use client'`

### 3.4 Migrer `<img>` vers `next/image`

7 fichiers utilisent `<img>` natif au lieu de `next/image`. Pour chacun :

```typescript
// ❌ AVANT
<img src={url} alt="..." className="..." />

// ✅ APRÈS
import Image from 'next/image';
<Image src={url} alt="..." width={...} height={...} className="..." />
```

Si la taille n'est pas connue à l'avance (images uploadées), utiliser `fill` avec un conteneur positionné :

```typescript
<div className="relative w-full aspect-video">
  <Image src={url} alt="..." fill className="object-cover rounded-xl" />
</div>
```

**Fichiers à migrer :** `FiscalClient.tsx`, `ExpensesClient.tsx`, `PhotoTour.tsx`, `PersonalInfoClient.tsx`, `TenantProfilePreview.tsx`, `inspection/.../keys/page.tsx`, `EmptyStateRooms.tsx`.

### 3.5 Vérifications Agent 3

- [ ] `ConversationClient.tsx` : messages envoyés en optimistic (0 router.refresh pour l'envoi)
- [ ] `SaveListingMenu.tsx` : toggle favori optimistic (0 router.refresh)
- [ ] `LandlordCalendarClient.tsx` : actions de visite sans router.refresh systématique
- [ ] `UserMenu.tsx` : tous les items de navigation utilisent `<Link>`
- [ ] `ListingCard.tsx` : clic sur la card utilise `<Link>` (pas router.push)
- [ ] `EmptyState.tsx` : CTAs utilisent `<Link>`
- [ ] Au moins 20 ClientOnly supprimés sur les 113 (ceux des pages account/ en priorité)
- [ ] 7 fichiers migrés de `<img>` vers `next/image`
- [ ] Nombre total de `router.refresh()` réduit de 87 à < 40
- [ ] Aucune régression fonctionnelle — tester chaque flow modifié
- [ ] `npm run build` → 0 erreurs

---

## MÉTRIQUES DE SUCCÈS

Après l'application des 3 agents, mesurer :

| Métrique | Avant | Cible |
|----------|-------|-------|
| TTFB (France, dashboard) | 500-800ms | 200-400ms |
| FCP Dashboard | 800-1200ms | 300-500ms |
| Navigation retour (dashboard → page → dashboard) | 600-1000ms skeleton | < 100ms (cache client 30s) |
| Envoi message (conversation) | 500-2000ms refresh | < 100ms optimistic |
| Page calendrier | 1000-1500ms | 300-500ms |
| Toggle favori | 500-1000ms | < 50ms |

Pour mesurer : ouvrir les DevTools → Network → cliquer "Disable cache" → naviguer. Noter le temps de chargement de chaque page. Comparer avant/après.
