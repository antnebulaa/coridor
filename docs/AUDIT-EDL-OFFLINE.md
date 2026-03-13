# Audit EDL — Architecture actuelle & Résilience réseau

> Date : 12 mars 2026

---

## 1. Stockage des photos

### Upload flow
Les photos sont uploadées **directement vers Cloudinary depuis le navigateur**, sans passer par le serveur Next.js.

**Composant :** `components/inspection/CameraCapture.tsx`

1. L'utilisateur prend une photo via `<input type="file" accept="image/*" capture="environment">` (pas de `useNativeCamera.ts`)
2. L'image est compressée côté client avec `browser-image-compression` (Web Worker)
3. Upload parallèle : Cloudinary + calcul SHA-256
4. Callback `onCapture(url, thumbnailUrl, sha256)` vers le parent

**Compression (lib/imageCompression.ts) :**
- `EDL_OVERVIEW_OPTIONS` : 1 Mo max, 2048px, WebP
- `EDL_DETAIL_OPTIONS` : 0.5 Mo max, 1200px, WebP

**API :** `POST /api/inspection/[inspectionId]/photos` — enregistre les métadonnées en BDD :
```
{ type, url, thumbnailUrl, sha256, inspectionRoomId, inspectionElementId, latitude, longitude, deviceInfo, capturedAt }
```

### Points clés
- **Pas de sharp/jimp** — toute la compression est côté navigateur
- **Pas de useNativeCamera** — input HTML5 classique avec `capture="environment"`
- **Upload immédiat** — la photo part vers Cloudinary dès la capture, avant confirmation utilisateur
- **Pas de queue d'upload** — si le réseau coupe pendant l'upload, la photo est perdue silencieusement

---

## 2. Sauvegarde automatique

### Architecture à 2 niveaux (`hooks/useInspection.ts`)

**Niveau 1 — sessionStorage (2s debounce) :**
```typescript
const SESSION_SAVE_DELAY = 2000;
// Clé : edl_${inspectionId}
// Donnée : { data: FullInspection, savedAt: Date.now() }
// TTL : 24h
// Optimisation : requestIdleCallback si disponible
```
- Sauvegarde l'intégralité de l'objet inspection en JSON
- Restauré au rechargement de page si l'API échoue
- **Limité au même onglet** (sessionStorage, pas localStorage)
- Fermer l'onglet = données perdues

**Niveau 2 — PATCH API (5s debounce) :**
```typescript
const AUTO_SAVE_DELAY = 5000;
// PATCH /api/inspection/${inspectionId}
// Payload : { touch: true }
```
- Ne sauvegarde **que le timestamp `updatedAt`** — pas les données modifiées
- Les vrais changements (éléments, conditions, natures) sont envoyés **individuellement** via leurs propres appels API au moment de chaque interaction
- Fail silencieux si réseau indisponible

### Que se passe-t-il si le réseau coupe ?

| Scénario | Résultat |
|----------|----------|
| Coupure brève (<5s) | Probablement transparent — les requêtes en vol échouent, les suivantes passent |
| Coupure prolongée (>30s) | Les modifications en mémoire sont conservées dans l'onglet. sessionStorage sauvegarde toutes les 2s. Mais aucune donnée n'est persistée en BDD |
| Rechargement de page pendant coupure | Tentative API → échec → restauration sessionStorage (si <24h) |
| Fermeture de l'onglet pendant coupure | **Données perdues** — sessionStorage ne survit pas à la fermeture |
| Photo prise hors réseau | **Photo perdue** — l'upload Cloudinary échoue, pas de retry, pas de queue |

### Verdict
La sauvegarde auto est un **tampon pour les micro-coupures**, pas une vraie résilience offline. Les mutations individuelles (condition d'un élément, nature d'un revêtement) sont des requêtes API immédiates — si elles échouent, le changement est en mémoire locale mais jamais persisté côté serveur.

---

## 3. Architecture du state côté client

### Hook central : `hooks/useInspection.ts`

**State :**
- `inspection: FullInspection | null` — objet complet (rooms, elements, photos, meters, keys, furniture, signatures)
- `isLoading`, `error`, `isSaving`, `isOffline`

**14 méthodes exposées :**
`updateMeter`, `updateKey`, `addRoom`, `updateRoom`, `addElement`, `updateElement`, `addPhoto`, `sign`, `getSignLink`, `generatePdf`, `updateInspection`, etc.

**Pattern : optimistic updates**
1. State local mis à jour immédiatement
2. Requête API en background
3. Si erreur → `fetchInspection()` pour rollback depuis le serveur

### Composant principal : `app/[locale]/inspection/[inspectionId]/rooms/[roomId]/page.tsx`

**~860 lignes**, gère :
- Phase machine : `OVERVIEW → SURFACE_PHOTO → SURFACE_QUALIFY → DEGRAD_* → EQUIP → OBS → DONE`
- Navigation entre surfaces (sol, murs, plafond) via index
- Ajout d'équipements
- Gestion des natures (multi-select débounced 600ms)

### Flow de données entre écrans

```
Hub Pièces (/inspection/[id])
  └── Pièce (/inspection/[id]/rooms/[roomId])
       ├── Phase OVERVIEW (photos générales)
       ├── Phase SURFACE (photo + qualification par surface)
       ├── Phase EQUIP (équipements + conditions)
       └── Phase OBS (observations texte/audio)

Compteurs (/inspection/[id]/meters)
Clés (/inspection/[id]/keys)
Mobilier (/inspection/[id]/furniture)
Signature bailleur (/inspection/[id]/sign)
Envoi lien locataire (/inspection/[id]/send)
Signature locataire (/inspection/[id]/tenant-sign/[token])
Done (/inspection/[id]/done)
```

Toutes ces pages utilisent le même `useInspection(inspectionId)` — le state est partagé via le hook (fetch API à chaque montage + sessionStorage fallback).

---

## 4. Flow photo dans une pièce

### Composant : `CameraCapture.tsx`

**Modes :**
1. **Viewfinder** — bouton shutter → ouvre `<input type="file">`
2. **Preview** — affiche la photo capturée, boutons confirmer/reprendre

### Liaison photo → élément

La liaison dépend de la **phase** dans le composant parent (`RoomInspectionPage`) :

| Phase | `type` | `inspectionElementId` | Description |
|-------|--------|----------------------|-------------|
| OVERVIEW | `OVERVIEW` | `null` | Photo générale de la pièce |
| SURFACE_PHOTO | `SURFACE` | `currentSurface.id` | Photo du sol/mur/plafond |
| DEGRAD_PHOTO | `DETAIL` | `currentDegradElementId` | Gros plan dégradation |

**Upload immédiat :** La photo part vers Cloudinary dès la capture dans `CameraCapture`, puis `addPhoto()` enregistre les métadonnées en BDD via `POST /api/inspection/[id]/photos`.

**Réconciliation d'ID :** `addPhoto` dans `useInspection.ts` crée un ID temporaire côté client, puis le remplace par l'ID serveur au retour de la requête.

---

## 5. Service Worker (`public/sw.js`)

### Fonctionnalités actuelles

| Feature | Implémenté | Détails |
|---------|-----------|---------|
| Precache assets | Oui | `/`, `/manifest.json`, `/images/logo.png` |
| Network-first (pages) | Oui | Essaie le réseau, fallback cache, puis `/` |
| Cache-first (assets) | Oui | Images, fonts, `_next/static` |
| Cache API routes | **Non** | `/api/` et `/auth/` sont exclus du cache |
| Background Sync | **Non** | Aucune logique de sync différé |
| Offline queue | **Non** | Pas de file d'attente pour les requêtes échouées |
| Push notifications | Oui | Réception + affichage + clic → navigation |

### Verdict
Le SW est un **cache basique pour la PWA** — il ne fournit aucune aide pour l'EDL offline. Les routes API ne sont pas cachées, il n'y a pas de background sync, pas de queue de requêtes.

---

## 6. IndexedDB / Stockage local

### Résultat de la recherche

| Technologie | Utilisée | Détails |
|-------------|---------|---------|
| IndexedDB | **Non** | Aucun appel dans le code source |
| `idb` (npm) | **Non** | Pas dans `package.json` |
| `dexie` (npm) | **Non** | Pas dans `package.json` |
| `localforage` (npm) | **Non** | Pas dans `package.json` |
| localStorage | **Non** (pour l'EDL) | Utilisé ailleurs (recherche, install prompt) |
| sessionStorage | **Oui** | `edl_${inspectionId}` — inspection complète, 24h TTL |

### Limites du sessionStorage pour l'EDL
- **5 Mo max** par origine (peut être insuffisant avec beaucoup de données d'inspection)
- **Limité à l'onglet** — fermer l'onglet = données perdues
- **Pas de blob/binary** — impossible de stocker des photos en attente d'upload
- **Sérialisation JSON** — performance dégradée sur de gros objets

---

## Synthèse des faiblesses offline

| Problème | Sévérité | Impact utilisateur |
|----------|----------|-------------------|
| Photos perdues si réseau coupe pendant upload | **CRITIQUE** | L'utilisateur prend la photo, croit que c'est sauvegardé, mais rien n'est persisté |
| Mutations API échouent silencieusement | **HAUTE** | L'utilisateur change une condition "Bon" → "Dégradé", le changement reste en mémoire mais jamais en BDD |
| sessionStorage ne survit pas à la fermeture d'onglet | **HAUTE** | Sur mobile, un appel téléphonique ou un switch d'app peut killer le tab Safari |
| Pas de détection offline visible | **MOYENNE** | L'utilisateur ne sait pas que ses actions ne sont pas sauvegardées |
| Pas d'IndexedDB pour les gros blobs (photos) | **HAUTE** | Impossible de mettre en queue les photos pour upload ultérieur |
| Service Worker ne cache pas les routes API | **MOYENNE** | Même la lecture de l'inspection échoue hors ligne |

---

## Recommandations pour la résilience offline

### Priorité 1 — Queue de photos offline
- Stocker les photos compressées dans **IndexedDB** (via `idb` ou `dexie`) avant l'upload Cloudinary
- Upload en background quand le réseau revient (Background Sync API ou polling)
- Indicateur visuel : pastille orange "X photos en attente d'upload"

### Priorité 2 — Mutations offline-first
- Toutes les mutations (conditions, natures, observations) écrites d'abord dans **IndexedDB**
- Sync vers l'API en background avec retry exponentiel
- Conflit resolution : last-write-wins avec timestamp

### Priorité 3 — Détection et UX offline
- Bannière visible quand `navigator.onLine === false` ou quand les requêtes échouent
- Mode "Hors ligne" explicite avec indicateur de sync pending
- Compteur "X modifications en attente de synchronisation"

### Priorité 4 — Service Worker enrichi
- Cache la réponse `GET /api/inspection/[id]` pour permettre la lecture offline
- Background Sync pour les photos et mutations en queue
- Précache les assets de l'EDL (composants, fonts, icônes)

### Priorité 5 — Migration sessionStorage → IndexedDB + localStorage
- IndexedDB pour les données structurées (inspection complète) et les blobs (photos)
- localStorage (pas sessionStorage) pour la persistance cross-onglet
- Garder sessionStorage comme cache L1 pour la performance
