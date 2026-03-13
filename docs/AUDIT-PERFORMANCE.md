# Audit Performance — Coridor

> Date : 12 mars 2026
> Next.js 16.0.10 · Vercel Serverless · PostgreSQL (Supabase)

---

## Résumé exécutif

L'app a de bonnes fondations (modales lazy-loaded, dénormalisation cardData, Promise.all sur le dashboard, 11 loading.tsx). Mais **3 catégories de problèmes** causent la lenteur ressentie :

1. **87 appels `router.refresh()`** dans 56 fichiers — chaque refresh re-fetch toute la page serveur
2. **Zéro `<Suspense>` boundary** dans les pages — pas de streaming, le HTML est bloqué jusqu'au dernier `await`
3. **Requêtes Prisma trop lourdes** sur certaines pages (calendar séquentiel, properties 4 niveaux d'include)

---

## 1. Configuration Next.js

### next.config.ts

```typescript
{
  typescript: { ignoreBuildErrors: true },      // ⚠️ Masque les erreurs de type
  experimental: { optimizePackageImports: ['react-icons'] },
  images: { remotePatterns: [cloudinary, github, google, supabase, ui-avatars] },
  // PAS de staleTimes
  // PAS de headers / Cache-Control custom
}
```

| Élément | Statut | Impact |
|---------|--------|--------|
| `staleTimes` | Absent | Pas de contrôle du cache client-side router |
| `ignoreBuildErrors: true` | ⚠️ | Masque les erreurs TS qui pourraient causer des bugs runtime |
| `optimizePackageImports` | Seulement `react-icons` | `lucide-react` manque (utilisé partout) |
| Edge Runtime | 0 route API | Toutes les API sont en serverless Node.js |
| Région Vercel | Non configurée dans vercel.json | Défaut `iad1` (US East) — loin de la France |

### Recommandations config

```typescript
// next.config.ts — ajouts recommandés
{
  experimental: {
    optimizePackageImports: ['react-icons', 'lucide-react', 'recharts'],
    staleTimes: {
      dynamic: 30,  // 30s cache pour les pages force-dynamic
      static: 300,  // 5min pour les pages statiques
    },
  },
}
```

---

## 2. Pages dynamiques vs statiques

### Pages avec `force-dynamic` (5)

| Page | Justifié ? |
|------|-----------|
| `/dashboard` | Oui — données temps réel |
| `/properties` | Oui — données proprio |
| `/listings/[id]` | Discutable — pourrait être `revalidate: 60` |
| `/selection/[id]` | Oui — pipeline candidats |
| `/dashboard/my-rental` | Oui — données locataire |

### Pages SANS export dynamic mais avec données user-specific

| Page | Problème |
|------|----------|
| `/` (home) | Fetch `getCurrentUser()` + `getListings()` — devrait être dynamique ou les données user fetchées client-side |
| `/calendar` | Fetch `getLandlordCalendarData()` — données propriétaire |
| `/finances` | Fetch `getFinancialReport()` — données financières |
| `/inbox` (layout) | Fetch `getConversations()` — conversations privées |

**Note :** En pratique, Next.js détecte les appels à `cookies()` ou `headers()` dans `getCurrentUser()` et force le rendu dynamique automatiquement. Ces pages sont donc probablement déjà dynamiques de facto. Mais l'absence d'export explicite rend le comportement opaque et fragile.

### Recommandation

Ajouter `export const dynamic = 'force-dynamic'` aux 4 pages ci-dessus pour être explicite, ou mieux : utiliser `<Suspense>` pour streamer les parties dynamiques.

---

## 3. Loading.tsx et Suspense

### Fichiers loading.tsx présents (11)

```
app/[locale]/loading.tsx
app/[locale]/account/loading.tsx
app/[locale]/calendar/loading.tsx
app/[locale]/dashboard/loading.tsx
app/[locale]/favorites/loading.tsx
app/[locale]/finances/loading.tsx
app/[locale]/finances/suivi-loyers/loading.tsx
app/[locale]/inbox/loading.tsx
app/[locale]/inbox/[conversationId]/loading.tsx
app/[locale]/properties/loading.tsx
app/[locale]/properties/[listingId]/edit/loading.tsx
```

### Suspense : ZÉRO dans les pages

**Aucun `<Suspense>` trouvé dans les fichiers page.tsx.** Conséquence : chaque page bloque le rendu complet jusqu'à ce que toutes les requêtes serveur soient terminées. Pas de streaming progressif.

| Page | Pattern actuel | Pattern optimal |
|------|---------------|-----------------|
| Dashboard | `Promise.all([...])` → render tout | Header immédiat → `<Suspense>` pour KPIs + PropertyList |
| Finances | `await getFinancialReport()` → render tout | Header + QuickLinks immédiats → `<Suspense>` pour les données |
| Calendar | 6 queries séquentielles → render tout | Header + nav date immédiats → `<Suspense>` pour les événements |
| Properties | `await getProperties()` → render tout | Header + filtres immédiats → `<Suspense>` pour la grid |

### Impact estimé

Ajouter des `<Suspense>` boundaries permettrait d'afficher le header/layout en ~100ms au lieu d'attendre 400-800ms pour les données. Le Time to First Contentful Paint baisserait significativement.

---

## 4. Server actions et requêtes Prisma

### Dashboard (page la plus visitée)

**Mode propriétaire :** 2 batches parallèles
```
Batch 1: Promise.all([getFinancialAnalytics(), getOperationalStats()])
  - getFinancialAnalytics() → ~5 queries (agrégations)
  - getOperationalStats() → 10 queries en Promise.all ✓
Batch 2: données passées au client
```

**Problème dans getOperationalStats query #5 :**
```prisma
findMany(Property) {
  select: {
    rentalUnits → listings → applications → candidateScope.creatorUser
                                           → financials (take: 1)
                                           → rentPaymentTrackings (take: 1)
  }
}
```
Pour 10 biens × 5 annonces × N candidatures = potentiellement centaines de lignes retournées.

### Properties

**1 seule query** mais massive :
```prisma
findMany(Property) {
  include: {
    owner: true,                    // ⚠️ Toutes les colonnes owner
    images: true,                   // ⚠️ TOUTES les images (pas de take)
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
}
```
**4 niveaux de profondeur**, pas de `select`, pas de `take` sur les images. Pour 5 propriétés avec 20 images chacune → 1000+ lignes retournées.

### Calendar — CRITIQUE

**6 queries SÉQUENTIELLES** (pas de Promise.all) :
1. `findMany(VisitSlot)`
2. `findMany(Property)` avec 3 niveaux
3. `findMany(Visit)` avec **4 niveaux** (candidate → tenantProfile → guarantors → additionalIncomes)
4. `findMany(Inspection)`
5. `findMany(RentPaymentTracking)`
6. `findMany(LegalReminder)`

Si chaque query prend 100-200ms → **600-1200ms** juste pour les requêtes DB.

**Fix immédiat :** Wrapper dans `Promise.all()` → 100-200ms total.

### Conversations (getConversations)

**5 niveaux d'include :**
```
Conversation → users → createdScopes → applications (3 niveaux)
             → listing → rentalUnit → property → owner/images (5 niveaux)
```

Pour 30 conversations → potentiellement 120+ round-trips de DB.

### Résumé requêtes

| Page | Queries | Parallélisées ? | Profondeur max | Fix |
|------|---------|----------------|----------------|-----|
| Dashboard | 15+ | Oui (Promise.all) | 4 | Ajouter select/take sur query #5 |
| Properties | 1 | N/A | 4 | Ajouter select, take: 5 sur images |
| Calendar | 6 | **Non — séquentiel** | 4 | **Promise.all()** |
| Conversations | 1 | N/A | 5 | select au lieu d'include |
| Finances | 1 | N/A | 2 | OK |

---

## 5. Navigation et prefetch

### MobileMenu.tsx
✅ Utilise `<Link>` de `@/i18n/navigation` — prefetch automatique activé.
✅ State optimistic ajouté pour la bulle active (instantané au clic).

### UserMenu.tsx — 15 `router.push()` dans components/

| Fichier | Occurrences | Impact |
|---------|-------------|--------|
| `components/navbar/UserMenu.tsx` | Multiples items du dropdown | Pas de prefetch, navigation lente |
| `components/modals/SearchModal.tsx` | Submit de recherche | OK — dynamique |
| `components/listings/ListingCard.tsx` | Clic sur la card | ⚠️ Devrait être `<Link>` |
| `components/navbar/NotificationCenter.tsx` | Clic sur notif | OK — dynamique |
| `components/EmptyState.tsx` | CTA | ⚠️ Devrait être `<Link>` |
| `components/dashboard/ActionCards.tsx` | Clic sur action | OK — conditionnel |
| + 9 autres composants | | |

### AccountSidebar.tsx
✅ Utilise `<Link>` de `@/i18n/navigation` partout.

### Recommandation

Remplacer les `router.push()` de UserMenu.tsx et ListingCard.tsx par des `<Link>`. Ce sont les navigations les plus fréquentes.

---

## 6. Re-renders client — `router.refresh()`

### 87 occurrences dans 56 fichiers

**Top offenders :**

| Fichier | Occurrences | Contexte |
|---------|-------------|----------|
| `ConversationClient.tsx` | 6 | Chaque message envoyé/action |
| `SaveListingMenu.tsx` | 5 | Chaque ajout/retrait favori |
| `LandlordCalendarClient.tsx` | 4 | Chaque action visite |
| `PollManagementClient.tsx` | 4 | Admin polls |
| `TenantProfileClient.tsx` | 3 | Sauvegarde profil |
| `CommutePreferences.tsx` | 3 | Changements trajet |
| `AllPhotosModal.tsx` | 3 | Gestion photos |
| Divers (49 fichiers) | 1-2 chacun | Mutations variées |

### Problème

`router.refresh()` re-fetch **toute la page serveur** (toutes les server actions, tous les includes Prisma).

Exemple concret : l'utilisateur envoie un message dans la conversation → `router.refresh()` → le serveur re-exécute `getConversations()` avec ses 5 niveaux d'include + `getMessages()` + résolution de tous les documents. **Coût : 500ms-2s** juste pour afficher un message déjà envoyé.

### Recommandation

| Pattern actuel | Pattern recommandé |
|---|---|
| `await axios.post(...); router.refresh()` | `await axios.post(...); mutate('/api/...')` (SWR) |
| `router.refresh()` après mutation | `revalidatePath()` dans un Server Action |
| `router.refresh()` pour UI optimistic | Mise à jour locale du state + `mutate()` en background |

**Objectif :** Réduire de 87 à ~10-15 `router.refresh()` (ceux qui ont réellement besoin de tout re-fetch).

---

## 7. Bundle JavaScript

Next.js 16 n'affiche plus les tailles de routes dans le build output. Observations :

- **0 page statique** (sauf `_not-found`, `icon.png`, `apple-icon.png`)
- **Toutes les pages sont `ƒ (Dynamic)`** — même celles sans `force-dynamic` (à cause de `getCurrentUser()` → `cookies()`)
- **8 modales lazy-loaded** via `next/dynamic` avec `ssr: false` ✅
- **15 fichiers** utilisent `next/dynamic` au total

### Dépendances lourdes

| Package | Taille estimée (gzip) | Lazy-loaded ? |
|---------|----------------------|---------------|
| `@react-pdf/renderer` | ~500KB | Oui (LeaseViewerClient) |
| `mapbox-gl` | ~800KB | Oui (Map composants) |
| `recharts` | ~200KB | Non — importé dans plusieurs pages |
| `framer-motion` | ~130KB | Non — utilisé partout |
| `cheerio` | ~100KB | Server-only (import listing) |

### Recommandation

Ajouter `recharts` à `optimizePackageImports` et vérifier que `lucide-react` y est aussi.

---

## 8. Images

### `<img>` natif vs `next/image`

| Métrique | Compte |
|----------|--------|
| Fichiers avec `<img>` natif | 7 |
| Fichiers avec `next/image` | 40 |

**Ratio 40:7** — bon mais les 7 fichiers avec `<img>` natif ne bénéficient pas du lazy-loading/optimisation automatique :

- `FiscalClient.tsx`
- `ExpensesClient.tsx`
- `PhotoTour.tsx`
- `PersonalInfoClient.tsx`
- `TenantProfilePreview.tsx`
- `inspection/.../keys/page.tsx`
- `EmptyStateRooms.tsx`

### Config images

✅ `remotePatterns` configuré pour Cloudinary, Supabase, GitHub, Google.
✅ Pas de `unoptimized: true`.

---

## 9. Layout et composants lourds

### Layout principal (`app/[locale]/layout.tsx`)

```
<AuthProvider>
  <NextIntlClientProvider>
    <ThemeProvider>
      <Toaster />
      <ModalProvider />          ← 8 modales lazy-loaded ✅
      <PushNotificationManager />
      <InstallPrompt />
      <Navbar />                 ← dans Suspense ✅
      <MobileMenu />             ← dans Suspense ✅
      <MainLayout>
        <TransitionProvider>
          {children}
```

✅ Architecture solide — modales lazy-loaded, navigation dans Suspense.

### ClientOnly — 113 occurrences dans 29 fichiers

`ClientOnly` ajoute un cycle de render (mount → rerender avec children). Pour les 29 pages qui l'utilisent, c'est un flash blanc supplémentaire.

**Pages avec ClientOnly qui n'en ont probablement pas besoin :** les pages account/ qui sont déjà des Client Components purs.

---

## 10. API Routes et infra

### Runtime

- **0 route Edge** — tout est en serverless Node.js
- Région Vercel non spécifiée → défaut `iad1` (US East)

### Recommandation région

```json
// vercel.json
{
  "regions": ["cdg1"],  // Paris — plus proche des users français
  "crons": [...]
}
```

**Impact estimé :** -100-150ms sur le TTFB pour les utilisateurs en France.

### Crons

9 crons configurés, bien répartis sauf :
- `generate-receipts` (4h le 5 du mois) et `refresh-landlord-stats` (4h quotidien) sont sur le même créneau `0 4`.

---

## Plan d'action — par priorité

### Immédiat (< 30 min, gros impact)

| # | Action | Impact estimé | Fichier |
|---|--------|--------------|---------|
| 1 | **Promise.all()** dans getLandlordCalendarData | -400-800ms sur /calendar | `app/actions/getLandlordCalendarData.ts` |
| 2 | **Région `cdg1`** dans vercel.json | -100-150ms TTFB global | `vercel.json` |
| 3 | **`lucide-react` + `recharts`** dans optimizePackageImports | -50-100KB bundle | `next.config.ts` |

### Court terme (< 2h, impact significatif)

| # | Action | Impact estimé | Fichiers |
|---|--------|--------------|----------|
| 4 | **Remplacer router.push() par Link** dans UserMenu + ListingCard | Navigation instantanée | 2 fichiers |
| 5 | **Ajouter select/take** dans getProperties | -60% données transférées | `app/actions/getProperties.ts` |
| 6 | **Suspense boundaries** sur dashboard + finances | FCP -300-500ms | 2-3 page.tsx |
| 7 | **Réduire les includes** dans getConversations | -70% requête DB | `app/actions/getConversations.ts` |

### Moyen terme (< 1 jour, amélioration systémique)

| # | Action | Impact estimé | Fichiers |
|---|--------|--------------|----------|
| 8 | **Remplacer 50+ router.refresh()** par SWR mutate | -5-10s par session | 30+ fichiers |
| 9 | **Migrer 7 `<img>`** vers next/image | Lazy-load + optimisation auto | 7 fichiers |
| 10 | **Supprimer ClientOnly inutiles** | -1 cycle de render par page | 20+ fichiers |
| 11 | **Fixer `ignoreBuildErrors: true`** | Qualité / bugs runtime | next.config.ts |

### Impact global estimé

| Métrique | Avant | Après (toutes les actions) |
|----------|-------|---------------------------|
| TTFB (France) | 500-800ms | 200-400ms |
| FCP Dashboard | 800-1200ms | 300-500ms |
| Navigation bottom bar | 600-1000ms | 100-300ms |
| Envoi message (conversation) | 500-2000ms refresh | 50-100ms optimistic |
| Page calendrier | 1000-1500ms | 300-500ms |
