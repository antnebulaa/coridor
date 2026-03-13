# Mode Offline-First pour l'EDL — Photos en queue, persistance IndexedDB, sync background

## Contexte

L'EDL est le feature de Coridor avec les pires conditions réseau : le proprio est dans un appartement, potentiellement en sous-sol ou cage d'escalier, et prend 20 à 50 photos. Actuellement :

- **Photos perdues** si le réseau coupe pendant l'upload Cloudinary (pas de retry, pas de queue)
- **Mutations perdues** si les appels API échouent (changements de condition en mémoire mais jamais en BDD)
- **EDL entier perdu** si l'onglet est fermé (sessionStorage ne survit pas)
- **Aucun indicateur** que l'utilisateur travaille hors ligne

Ce prompt transforme l'EDL en **offline-first** : tout est sauvegardé localement d'abord (IndexedDB), uploadé en background quand le réseau est disponible, et l'utilisateur ne perd jamais son travail.

**Ce qui existe déjà et qu'on garde :**
- `browser-image-compression` pour la compression côté client (Web Worker, WebP, 2048px/1200px)
- `CameraCapture.tsx` pour la prise de photo
- `useInspection.ts` comme hook central (14 méthodes, optimistic updates)
- Le sessionStorage comme cache L1 (debounce 2s)
- Upload vers Cloudinary (pas Supabase Storage)
- `POST /api/inspection/[id]/photos` pour les métadonnées
- Le Service Worker existant (`public/sw.js`) avec cache basique PWA

**Ce qu'on ajoute :**
- IndexedDB comme stockage persistant (données + photos blob)
- File d'attente d'upload avec retry automatique
- Sync background des mutations API
- Indicateur réseau/sync visible pendant l'EDL

---

## ORGANISATION EN TEAM AGENTS

### Agent 1 — Stockage IndexedDB & persistance

**Mission :** Créer la couche de stockage IndexedDB qui remplace sessionStorage comme source de vérité pour l'EDL. Stocker les données d'inspection ET les blobs photos compressés.

**Fichiers à produire :**
- `lib/edl/offlineStorage.ts` — **Nouveau**
- Modifier `hooks/useInspection.ts` — Remplacer sessionStorage par IndexedDB

### Agent 2 — Queue d'upload photos & sync mutations

**Mission :** Créer le système de file d'attente pour les photos et les mutations API. Upload en background, retry automatique, gestion du réseau.

**Fichiers à produire :**
- `lib/edl/syncQueue.ts` — **Nouveau**
- `lib/edl/photoQueue.ts` — **Nouveau**
- Modifier `components/inspection/CameraCapture.tsx` — Stocker en local avant upload

### Agent 3 — UX offline & indicateurs

**Mission :** Créer les composants visuels de l'état de synchronisation et intégrer le tout dans les pages EDL.

**Fichiers à produire :**
- `components/inspection/SyncStatusBar.tsx` — **Nouveau**
- `components/inspection/OfflineBanner.tsx` — **Nouveau**
- Modifier les pages d'inspection pour intégrer les indicateurs

---

## AGENT 1 — STOCKAGE INDEXEDDB

### Installation

```bash
npm install idb
```

Le package `idb` est un wrapper léger (~1KB) autour de l'API IndexedDB native. Il fournit une API Promise-based propre.

### offlineStorage.ts

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

/**
 * Schema IndexedDB pour l'EDL offline.
 * 
 * 3 object stores :
 * - inspections : données complètes de l'inspection (JSON)
 * - photos : blobs des photos compressées en attente d'upload
 * - mutations : queue des mutations API en attente de sync
 */
interface EdlDB extends DBSchema {
  inspections: {
    key: string; // inspectionId
    value: {
      inspectionId: string;
      data: any; // FullInspection
      savedAt: number;
      syncedAt: number | null; // null = jamais synced
    };
  };
  photos: {
    key: string; // ID temporaire unique
    value: {
      id: string;           // ID temporaire (crypto.randomUUID())
      inspectionId: string;
      blob: Blob;            // Photo compressée (WebP, 150-300KB)
      metadata: {
        type: string;        // OVERVIEW | SURFACE | DETAIL | METER | KEY
        inspectionRoomId: string | null;
        inspectionElementId: string | null;
        sha256: string;
        latitude: number | null;
        longitude: number | null;
        deviceInfo: string | null;
        capturedAt: string;  // ISO date
      };
      status: 'PENDING' | 'UPLOADING' | 'UPLOADED' | 'FAILED';
      cloudinaryUrl: string | null;
      thumbnailUrl: string | null;
      retryCount: number;
      createdAt: number;
    };
    indexes: {
      'by-inspection': string;
      'by-status': string;
    };
  };
  mutations: {
    key: string; // ID unique
    value: {
      id: string;
      inspectionId: string;
      type: string;          // 'UPDATE_ELEMENT' | 'ADD_ROOM' | 'UPDATE_METER' | etc.
      endpoint: string;      // ex: '/api/inspection/abc123/elements/xyz'
      method: 'POST' | 'PATCH' | 'DELETE';
      payload: any;
      status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
      retryCount: number;
      createdAt: number;
    };
    indexes: {
      'by-inspection': string;
      'by-status': string;
    };
  };
}

const DB_NAME = 'coridor-edl';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<EdlDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<EdlDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<EdlDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Inspections store
      if (!db.objectStoreNames.contains('inspections')) {
        db.createObjectStore('inspections', { keyPath: 'inspectionId' });
      }

      // Photos store
      if (!db.objectStoreNames.contains('photos')) {
        const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
        photoStore.createIndex('by-inspection', 'inspectionId');
        photoStore.createIndex('by-status', 'status');
      }

      // Mutations store
      if (!db.objectStoreNames.contains('mutations')) {
        const mutStore = db.createObjectStore('mutations', { keyPath: 'id' });
        mutStore.createIndex('by-inspection', 'inspectionId');
        mutStore.createIndex('by-status', 'status');
      }
    },
  });

  return dbInstance;
}

// ─── Inspection CRUD ───

export async function saveInspectionLocal(inspectionId: string, data: any): Promise<void> {
  const db = await getDB();
  await db.put('inspections', {
    inspectionId,
    data,
    savedAt: Date.now(),
    syncedAt: null,
  });
}

export async function getInspectionLocal(inspectionId: string): Promise<any | null> {
  const db = await getDB();
  const record = await db.get('inspections', inspectionId);
  return record?.data || null;
}

// ─── Photo CRUD ───

export async function savePhotoLocal(photo: EdlDB['photos']['value']): Promise<void> {
  const db = await getDB();
  await db.put('photos', photo);
}

export async function getPendingPhotos(inspectionId: string): Promise<EdlDB['photos']['value'][]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('photos', 'by-inspection', inspectionId);
  return all.filter(p => p.status === 'PENDING' || p.status === 'FAILED');
}

export async function getPhotoById(id: string): Promise<EdlDB['photos']['value'] | undefined> {
  const db = await getDB();
  return db.get('photos', id);
}

export async function updatePhotoStatus(
  id: string,
  status: EdlDB['photos']['value']['status'],
  urls?: { cloudinaryUrl: string; thumbnailUrl: string }
): Promise<void> {
  const db = await getDB();
  const photo = await db.get('photos', id);
  if (!photo) return;
  photo.status = status;
  if (urls) {
    photo.cloudinaryUrl = urls.cloudinaryUrl;
    photo.thumbnailUrl = urls.thumbnailUrl;
  }
  if (status === 'FAILED') photo.retryCount += 1;
  await db.put('photos', photo);
}

// ─── Mutation CRUD ───

export async function saveMutation(mutation: EdlDB['mutations']['value']): Promise<void> {
  const db = await getDB();
  await db.put('mutations', mutation);
}

export async function getPendingMutations(inspectionId: string): Promise<EdlDB['mutations']['value'][]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('mutations', 'by-inspection', inspectionId);
  return all.filter(m => m.status === 'PENDING' || m.status === 'FAILED').sort((a, b) => a.createdAt - b.createdAt);
}

export async function updateMutationStatus(id: string, status: string): Promise<void> {
  const db = await getDB();
  const mutation = await db.get('mutations', id);
  if (!mutation) return;
  mutation.status = status as any;
  if (status === 'FAILED') mutation.retryCount += 1;
  await db.put('mutations', mutation);
}

// ─── Nettoyage ───

export async function cleanupSyncedData(inspectionId: string): Promise<void> {
  const db = await getDB();

  // Supprimer les photos uploadées avec succès
  const photos = await db.getAllFromIndex('photos', 'by-inspection', inspectionId);
  for (const photo of photos) {
    if (photo.status === 'UPLOADED') {
      await db.delete('photos', photo.id);
    }
  }

  // Supprimer les mutations synced
  const mutations = await db.getAllFromIndex('mutations', 'by-inspection', inspectionId);
  for (const mutation of mutations) {
    if (mutation.status === 'SYNCED') {
      await db.delete('mutations', mutation.id);
    }
  }
}
```

### Modifier `hooks/useInspection.ts`

Le hook doit maintenant :

**Au montage :**
1. Essayer de charger depuis l'API (`GET /api/inspection/[id]`)
2. Si échec → charger depuis IndexedDB (`getInspectionLocal`)
3. Si les deux échouent → chercher dans sessionStorage (fallback legacy)

```typescript
// ✅ NOUVEAU flow de chargement
const fetchInspection = async () => {
  try {
    // Essayer l'API d'abord
    const res = await axios.get(`/api/inspection/${inspectionId}`);
    setInspection(res.data);
    // Sauvegarder en local pour le prochain accès offline
    await saveInspectionLocal(inspectionId, res.data);
  } catch {
    // Pas de réseau → charger depuis IndexedDB
    const local = await getInspectionLocal(inspectionId);
    if (local) {
      setInspection(local);
      setIsOffline(true);
    } else {
      // Dernier recours : sessionStorage (migration)
      const session = sessionStorage.getItem(`edl_${inspectionId}`);
      if (session) {
        const parsed = JSON.parse(session);
        setInspection(parsed.data);
      } else {
        setError('Impossible de charger l\'EDL');
      }
    }
  }
};
```

**À chaque mutation :**
1. Mettre à jour le state local (comme maintenant — optimistic update)
2. Sauvegarder dans IndexedDB (remplace le sessionStorage debounce 2s)
3. Enregistrer la mutation dans la queue (`saveMutation`)
4. Tenter l'appel API — si succès, marquer comme synced ; si échec, laisser dans la queue

```typescript
// ✅ NOUVEAU pattern pour chaque mutation (ex: updateElement)
const updateElement = async (elementId: string, data: Partial<Element>) => {
  // 1. Optimistic update
  setInspection(prev => {
    const updated = applyElementUpdate(prev, elementId, data);
    // 2. Sauvegarder en IndexedDB (fire-and-forget)
    saveInspectionLocal(inspectionId, updated);
    return updated;
  });

  // 3. Enregistrer la mutation dans la queue
  const mutationId = crypto.randomUUID();
  await saveMutation({
    id: mutationId,
    inspectionId,
    type: 'UPDATE_ELEMENT',
    endpoint: `/api/inspection/${inspectionId}/elements/${elementId}`,
    method: 'PATCH',
    payload: data,
    status: 'PENDING',
    retryCount: 0,
    createdAt: Date.now(),
  });

  // 4. Tenter le sync immédiat
  try {
    await axios.patch(`/api/inspection/${inspectionId}/elements/${elementId}`, data);
    await updateMutationStatus(mutationId, 'SYNCED');
  } catch {
    // Pas de problème — la mutation est dans la queue, sera retentée
    console.log('Mutation queued for later sync');
  }
};
```

**Garder sessionStorage** comme cache L1 pour la performance (il est synchrone, IndexedDB est async). Mais sessionStorage n'est plus la source de vérité — IndexedDB l'est.

---

## AGENT 2 — QUEUE D'UPLOAD PHOTOS & SYNC

### photoQueue.ts

Service qui gère l'upload des photos depuis IndexedDB vers Cloudinary :

```typescript
/**
 * PhotoQueue — Upload en background avec retry.
 * 
 * Fonctionnement :
 * 1. CameraCapture.tsx appelle queuePhoto() au lieu d'uploader directement
 * 2. La photo compressée (blob) est stockée dans IndexedDB
 * 3. Un URL.createObjectURL(blob) est retourné pour l'affichage local immédiat
 * 4. En background, processQueue() uploade vers Cloudinary une par une
 * 5. Après upload réussi, POST /api/inspection/[id]/photos pour les métadonnées
 * 6. La photo est marquée UPLOADED dans IndexedDB
 * 7. Le blob est supprimé d'IndexedDB après 1h (l'URL Cloudinary fait foi)
 * 
 * Retry :
 * - Si upload échoue → status FAILED, retry dans 10s
 * - Max 5 retries par photo
 * - Après 5 échecs → la photo reste en IndexedDB avec status FAILED
 * - L'utilisateur voit "X photos en échec" et peut réessayer manuellement
 * 
 * Réseau :
 * - Écoute navigator.onLine et les événements online/offline
 * - Quand le réseau revient → relance processQueue()
 * - Quand le réseau part → pause processQueue()
 */

class PhotoQueueService {
  private isProcessing = false;
  private inspectionId: string | null = null;
  private onStatusChange: ((stats: QueueStats) => void) | null = null;

  /**
   * Initialise la queue pour un EDL donné.
   * Appelé au montage de useInspection.
   */
  init(inspectionId: string, onStatusChange: (stats: QueueStats) => void) {
    this.inspectionId = inspectionId;
    this.onStatusChange = onStatusChange;

    // Écouter les changements de réseau
    window.addEventListener('online', () => this.processQueue());
    window.addEventListener('offline', () => this.pause());

    // Reprendre les uploads en attente (photos PENDING/FAILED d'une session précédente)
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  /**
   * Ajoute une photo à la queue.
   * Retourne un blob URL pour affichage local immédiat.
   */
  async queuePhoto(params: {
    blob: Blob;
    metadata: PhotoMetadata;
  }): Promise<{ localId: string; blobUrl: string }> {
    const localId = crypto.randomUUID();

    // Stocker dans IndexedDB
    await savePhotoLocal({
      id: localId,
      inspectionId: this.inspectionId!,
      blob: params.blob,
      metadata: params.metadata,
      status: 'PENDING',
      cloudinaryUrl: null,
      thumbnailUrl: null,
      retryCount: 0,
      createdAt: Date.now(),
    });

    // Générer un blob URL pour affichage immédiat
    const blobUrl = URL.createObjectURL(params.blob);

    // Notifier le changement de stats
    this.emitStats();

    // Lancer le processing si pas déjà en cours
    if (navigator.onLine && !this.isProcessing) {
      this.processQueue();
    }

    return { localId, blobUrl };
  }

  /**
   * Traite la queue : uploade les photos PENDING une par une.
   */
  private async processQueue() {
    if (this.isProcessing || !this.inspectionId) return;
    this.isProcessing = true;

    try {
      while (navigator.onLine) {
        const pending = await getPendingPhotos(this.inspectionId);
        if (pending.length === 0) break;

        // Prendre la plus ancienne
        const photo = pending.sort((a, b) => a.createdAt - b.createdAt)[0];

        // Skip si trop de retries
        if (photo.retryCount >= 5) continue;

        // Marquer comme en cours d'upload
        await updatePhotoStatus(photo.id, 'UPLOADING');
        this.emitStats();

        try {
          // 1. Upload vers Cloudinary
          const { url, thumbnailUrl } = await this.uploadToCloudinary(photo.blob);

          // 2. Enregistrer les métadonnées en BDD
          await axios.post(`/api/inspection/${this.inspectionId}/photos`, {
            ...photo.metadata,
            url,
            thumbnailUrl,
            sha256: photo.metadata.sha256,
          });

          // 3. Marquer comme uploadé
          await updatePhotoStatus(photo.id, 'UPLOADED', { cloudinaryUrl: url, thumbnailUrl });
          this.emitStats();

        } catch (error) {
          // Upload échoué → retry plus tard
          await updatePhotoStatus(photo.id, 'FAILED');
          this.emitStats();

          // Attendre avant le prochain retry
          await new Promise(r => setTimeout(r, Math.min(10000 * (photo.retryCount + 1), 60000)));
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Upload vers Cloudinary.
   * Réutiliser EXACTEMENT la même logique d'upload que CameraCapture.tsx actuel.
   * Ne pas réinventer — extraire la logique d'upload Cloudinary existante dans une fonction utilitaire.
   */
  private async uploadToCloudinary(blob: Blob): Promise<{ url: string; thumbnailUrl: string }> {
    // IMPORTANT : grep le code existant de CameraCapture.tsx pour trouver
    // la logique d'upload Cloudinary (FormData, cloud_name, upload_preset, etc.)
    // L'extraire dans une fonction partagée et l'appeler ici.
    throw new Error('À implémenter — extraire depuis CameraCapture.tsx');
  }

  private pause() {
    this.isProcessing = false;
  }

  private async emitStats() {
    if (!this.onStatusChange || !this.inspectionId) return;
    const db = await getDB();
    const all = await db.getAllFromIndex('photos', 'by-inspection', this.inspectionId);
    this.onStatusChange({
      total: all.length,
      pending: all.filter(p => p.status === 'PENDING').length,
      uploading: all.filter(p => p.status === 'UPLOADING').length,
      uploaded: all.filter(p => p.status === 'UPLOADED').length,
      failed: all.filter(p => p.status === 'FAILED').length,
    });
  }

  /**
   * Retry manuel des photos en échec.
   */
  async retryFailed() {
    if (!this.inspectionId) return;
    const db = await getDB();
    const failed = (await db.getAllFromIndex('photos', 'by-inspection', this.inspectionId))
      .filter(p => p.status === 'FAILED');
    for (const photo of failed) {
      photo.status = 'PENDING';
      photo.retryCount = 0;
      await db.put('photos', photo);
    }
    this.processQueue();
  }

  cleanup() {
    window.removeEventListener('online', () => this.processQueue());
    window.removeEventListener('offline', () => this.pause());
  }
}

export const photoQueue = new PhotoQueueService();

export interface QueueStats {
  total: number;
  pending: number;
  uploading: number;
  uploaded: number;
  failed: number;
}
```

### syncQueue.ts

Service qui traite la queue des mutations API en attente :

```typescript
/**
 * SyncQueue — Synchronise les mutations API en background.
 * 
 * Fonctionne en complément de photoQueue :
 * - photoQueue gère les uploads de photos (Cloudinary + métadonnées)
 * - syncQueue gère les mutations de données (conditions, natures, observations, compteurs, clés)
 * 
 * Les mutations sont traitées dans l'ordre chronologique (FIFO).
 * Si une mutation échoue, on retry 3 fois puis on passe à la suivante (pas de blocage).
 */

class SyncQueueService {
  private isProcessing = false;
  private inspectionId: string | null = null;
  private onStatusChange: ((pending: number) => void) | null = null;

  init(inspectionId: string, onStatusChange: (pending: number) => void) {
    this.inspectionId = inspectionId;
    this.onStatusChange = onStatusChange;

    window.addEventListener('online', () => this.processQueue());

    if (navigator.onLine) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.isProcessing || !this.inspectionId || !navigator.onLine) return;
    this.isProcessing = true;

    try {
      const pending = await getPendingMutations(this.inspectionId);

      for (const mutation of pending) {
        if (mutation.retryCount >= 3) {
          await updateMutationStatus(mutation.id, 'FAILED');
          continue;
        }

        await updateMutationStatus(mutation.id, 'SYNCING');

        try {
          await axios({
            method: mutation.method,
            url: mutation.endpoint,
            data: mutation.payload,
          });
          await updateMutationStatus(mutation.id, 'SYNCED');
        } catch {
          await updateMutationStatus(mutation.id, 'FAILED');
        }
      }

      this.emitStats();
    } finally {
      this.isProcessing = false;
    }
  }

  private async emitStats() {
    if (!this.onStatusChange || !this.inspectionId) return;
    const pending = await getPendingMutations(this.inspectionId);
    this.onStatusChange(pending.length);
  }

  cleanup() {
    window.removeEventListener('online', () => this.processQueue());
  }
}

export const syncQueue = new SyncQueueService();
```

### Modifier CameraCapture.tsx

Le changement clé : au lieu d'uploader directement vers Cloudinary, stocker en IndexedDB et retourner un blob URL.

```typescript
// ❌ AVANT dans CameraCapture.tsx (flow actuel)
const handleCapture = async (file: File) => {
  const compressed = await compressImage(file, EDL_OVERVIEW_OPTIONS);
  const sha256 = await calculateSHA256(compressed);
  const { url, thumbnailUrl } = await uploadToCloudinary(compressed); // ← BLOQUANT, 5-15s
  onCapture(url, thumbnailUrl, sha256);
};

// ✅ APRÈS (offline-first)
const handleCapture = async (file: File) => {
  const compressed = await compressImage(file, EDL_OVERVIEW_OPTIONS);
  const sha256 = await calculateSHA256(compressed);

  // Stocker en local et obtenir un blob URL immédiat
  const { localId, blobUrl } = await photoQueue.queuePhoto({
    blob: compressed,
    metadata: {
      type: currentPhotoType,
      inspectionRoomId: currentRoomId,
      inspectionElementId: currentElementId,
      sha256,
      latitude, longitude,
      deviceInfo: navigator.userAgent,
      capturedAt: new Date().toISOString(),
    },
  });

  // Retourner le blob URL pour affichage immédiat (pas d'attente réseau)
  onCapture(blobUrl, blobUrl, sha256, localId);
  // L'upload vers Cloudinary se fait en background via photoQueue
};
```

**IMPORTANT :** la callback `onCapture` doit maintenant aussi recevoir le `localId` pour que le parent puisse tracker la photo locale. Quand l'upload sera terminé, le blob URL sera remplacé par l'URL Cloudinary définitive.

**Extraire la logique d'upload Cloudinary** du CameraCapture.tsx actuel dans un fichier utilitaire `lib/edl/cloudinaryUpload.ts` pour que photoQueue puisse la réutiliser :

```bash
# Trouver la logique d'upload actuelle
grep -n "cloudinary\|upload_preset\|cloud_name\|FormData" components/inspection/CameraCapture.tsx
```

---

## AGENT 3 — UX OFFLINE & INDICATEURS

### SyncStatusBar.tsx

Barre discrète affichée en haut de toutes les pages EDL, sous le header :

```typescript
interface SyncStatusBarProps {
  photoStats: QueueStats;
  pendingMutations: number;
  isOnline: boolean;
}
```

**États visuels :**

**1. Tout synced, en ligne :**
```
(rien — la barre est invisible quand tout va bien)
```

**2. Upload en cours :**
```
┌──────────────────────────────────────────┐
│ 🟡 Synchronisation photos 12/30...       │
│ ━━━━━━━━━━━━━━░░░░░░░░░░░░ (40%)       │
└──────────────────────────────────────────┘
```
- Barre de progression verte sur fond neutre
- Texte petit (`text-xs`), fond `bg-amber-50 border-amber-100`
- Ne bloque pas l'interface — le proprio continue son EDL

**3. Hors ligne, données en attente :**
```
┌──────────────────────────────────────────┐
│ 🔴 Hors ligne · 8 photos + 3 modifs     │
│    en attente · Sauvegardé localement    │
└──────────────────────────────────────────┘
```
- Fond `bg-neutral-100 border-neutral-200` (pas rouge agressif)
- Rassurant : "Sauvegardé localement" — le proprio sait que rien n'est perdu
- Le compteur se met à jour en temps réel

**4. Photos en échec (après 5 retries) :**
```
┌──────────────────────────────────────────┐
│ ⚠️ 2 photos n'ont pas pu être envoyées  │
│    [ Réessayer ]                         │
└──────────────────────────────────────────┘
```
- Fond `bg-amber-50 border-amber-200`
- Bouton "Réessayer" qui appelle `photoQueue.retryFailed()`

**5. Tout synced après retour en ligne :**
```
┌──────────────────────────────────────────┐
│ ✅ Tout est synchronisé                  │
└──────────────────────────────────────────┘
(disparaît après 3 secondes)
```

### Intégration dans les pages EDL

Ajouter `<SyncStatusBar>` dans le layout commun des pages d'inspection. Si il n'y a pas de layout commun, l'ajouter dans chaque page :
- `/inspection/[id]/rooms/[roomId]/page.tsx`
- `/inspection/[id]/meters/page.tsx`
- `/inspection/[id]/keys/page.tsx`
- `/inspection/[id]/recap/page.tsx`
- `/inspection/[id]/sign/page.tsx`

**OU mieux :** créer un layout partagé pour les routes d'inspection :
```
app/[locale]/inspection/[inspectionId]/layout.tsx
```
qui wrappe toutes les sous-pages avec le `SyncStatusBar` + les providers des queues.

### Hook useEdlSync — Orchestrateur

```typescript
/**
 * Hook qui orchestre la synchronisation de l'EDL.
 * Utilisé dans le layout d'inspection.
 * 
 * Combine photoQueue + syncQueue + détection réseau.
 */
export function useEdlSync(inspectionId: string) {
  const [photoStats, setPhotoStats] = useState<QueueStats>({
    total: 0, pending: 0, uploading: 0, uploaded: 0, failed: 0
  });
  const [pendingMutations, setPendingMutations] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Init les queues
    photoQueue.init(inspectionId, setPhotoStats);
    syncQueue.init(inspectionId, setPendingMutations);

    // Écouter le réseau
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);

    return () => {
      photoQueue.cleanup();
      syncQueue.cleanup();
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, [inspectionId]);

  const isSynced = photoStats.pending === 0 &&
                   photoStats.uploading === 0 &&
                   photoStats.failed === 0 &&
                   pendingMutations === 0;

  return { photoStats, pendingMutations, isOnline, isSynced };
}
```

### Bloquer la signature si pas synced

Sur la page de signature (`/inspection/[id]/sign`), vérifier que toutes les photos sont uploadées et toutes les mutations synced AVANT de permettre la signature :

```typescript
// Dans la page de signature
const { isSynced, photoStats, pendingMutations } = useEdlSync(inspectionId);

// Si pas synced, afficher un message au lieu du bouton signer
{!isSynced ? (
  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
    <p className="text-sm font-medium text-amber-700">
      Synchronisation en cours...
    </p>
    <p className="text-xs text-amber-600 mt-1">
      {photoStats.pending + photoStats.uploading > 0 &&
        `${photoStats.pending + photoStats.uploading} photo(s) en attente d'envoi. `}
      {pendingMutations > 0 &&
        `${pendingMutations} modification(s) en attente. `}
      Connectez-vous au Wi-Fi pour accélérer.
    </p>
  </div>
) : (
  <SignatureCanvas onSign={handleSign} />
)}
```

### Écran "Reprendre l'EDL en cours"

Quand l'utilisateur ouvre l'app et qu'un EDL DRAFT existe dans IndexedDB (pas seulement en BDD), afficher un prompt :

```typescript
// Au montage du hub d'inspection ou du dashboard
const draftInspections = await getAllDraftInspections(); // IndexedDB

if (draftInspections.length > 0) {
  // Afficher un bottom sheet
  // "Vous avez un EDL en cours — [Bien] — commencé il y a 2h"
  // Boutons : [Reprendre] [Abandonner]
}
```

---

## FICHIERS RÉCAPITULATIF

### Nouveaux

| Fichier | Agent | Rôle |
|---------|-------|------|
| `lib/edl/offlineStorage.ts` | 1 | IndexedDB schema + CRUD |
| `lib/edl/photoQueue.ts` | 2 | Queue d'upload photos Cloudinary |
| `lib/edl/syncQueue.ts` | 2 | Queue de sync mutations API |
| `lib/edl/cloudinaryUpload.ts` | 2 | Logique d'upload Cloudinary extraite |
| `components/inspection/SyncStatusBar.tsx` | 3 | Barre de statut sync |
| `hooks/useEdlSync.ts` | 3 | Hook orchestrateur sync |

### Modifiés

| Fichier | Agent | Modification |
|---------|-------|-------------|
| `hooks/useInspection.ts` | 1 | IndexedDB comme source de vérité, mutations dans la queue |
| `components/inspection/CameraCapture.tsx` | 2 | Stocker en local d'abord, blob URL immédiat, upload en background |
| Pages d'inspection (rooms, meters, keys, recap, sign) | 3 | Intégrer SyncStatusBar |
| Page signature | 3 | Bloquer si pas synced |

### Dépendance

```bash
npm install idb
```

---

## VÉRIFICATIONS

### Agent 1
- [ ] `npm install idb` → package ajouté
- [ ] IndexedDB schema avec 3 stores (inspections, photos, mutations)
- [ ] `useInspection` charge depuis API → fallback IndexedDB → fallback sessionStorage
- [ ] Chaque mutation est écrite dans IndexedDB ET dans la queue de mutations
- [ ] sessionStorage conservé comme cache L1 (pas supprimé)
- [ ] Les données survivent à la fermeture de l'onglet (vérifier en ouvrant un nouvel onglet)

### Agent 2
- [ ] `CameraCapture.tsx` ne fait plus d'upload bloquant — retourne un blob URL immédiat
- [ ] La logique d'upload Cloudinary est extraite dans un fichier utilitaire partagé
- [ ] photoQueue uploade en background, une photo à la fois
- [ ] Retry automatique après échec (max 5 retries, backoff exponentiel)
- [ ] Quand le réseau revient (événement `online`), la queue reprend automatiquement
- [ ] Les photos PENDING d'une session précédente sont reprises au remontage
- [ ] syncQueue traite les mutations API dans l'ordre chronologique
- [ ] Les mutations FAILED après 3 retries ne bloquent pas les suivantes

### Agent 3
- [ ] SyncStatusBar visible pendant l'EDL quand des éléments sont en attente
- [ ] SyncStatusBar invisible quand tout est synced
- [ ] Compteur "X photos en attente" mis à jour en temps réel
- [ ] Mode offline : message rassurant "Sauvegardé localement"
- [ ] Bouton "Réessayer" pour les photos en échec
- [ ] Message "✅ Tout est synchronisé" qui disparaît après 3s
- [ ] Signature bloquée tant que la sync n'est pas complète
- [ ] Message explicite sur la page signature si des éléments sont en attente
- [ ] Écran "Reprendre l'EDL en cours" si un DRAFT existe dans IndexedDB
- [ ] `npm run build` → 0 erreurs
