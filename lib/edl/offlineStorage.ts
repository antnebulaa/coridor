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
