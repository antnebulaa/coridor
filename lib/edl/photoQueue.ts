import axios from 'axios';
import {
  savePhotoLocal,
  getPendingPhotos,
  updatePhotoStatus,
  getDB,
} from '@/lib/edl/offlineStorage';
import { uploadToCloudinary } from '@/lib/edl/cloudinaryUpload';

// ─── Types ───

export interface QueueStats {
  total: number;
  pending: number;
  uploading: number;
  uploaded: number;
  failed: number;
}

export interface PhotoMetadata {
  type: string; // OVERVIEW | SURFACE | DETAIL | METER | KEY
  inspectionRoomId: string | null;
  inspectionElementId: string | null;
  sha256: string;
  latitude: number | null;
  longitude: number | null;
  deviceInfo: string | null;
  capturedAt: string; // ISO date
}

// ─── Constants ───

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 10_000;
const MAX_RETRY_DELAY_MS = 60_000;

// ─── Service ───

/**
 * PhotoQueue — Upload en background avec retry.
 *
 * 1. CameraCapture appelle queuePhoto() au lieu d'uploader directement
 * 2. La photo compressée (blob) est stockée dans IndexedDB
 * 3. Un URL.createObjectURL(blob) est retourné pour affichage local immédiat
 * 4. En background, processQueue() uploade vers Cloudinary une par une
 * 5. Après upload réussi, POST /api/inspection/[id]/photos pour les métadonnées
 * 6. La photo est marquée UPLOADED dans IndexedDB
 *
 * Retry : max 5 retries par photo avec backoff exponentiel.
 * Réseau : écoute online/offline, reprend automatiquement au retour en ligne.
 */
class PhotoQueueService {
  private isProcessing = false;
  private inspectionId: string | null = null;
  private onStatusChange: ((stats: QueueStats) => void) | null = null;
  private boundOnline: (() => void) | null = null;
  private boundOffline: (() => void) | null = null;

  /**
   * Initialise la queue pour un EDL donné.
   * Appelé au montage du hook useEdlSync.
   */
  init(inspectionId: string, onStatusChange: (stats: QueueStats) => void) {
    this.inspectionId = inspectionId;
    this.onStatusChange = onStatusChange;

    // Bind pour pouvoir retirer les listeners proprement
    this.boundOnline = () => this.processQueue();
    this.boundOffline = () => this.pause();

    window.addEventListener('online', this.boundOnline);
    window.addEventListener('offline', this.boundOffline);

    // Reprendre les uploads en attente d'une session précédente
    if (navigator.onLine) {
      this.processQueue();
    }

    // Émettre les stats initiales
    this.emitStats();
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
        if (photo.retryCount >= MAX_RETRIES) {
          continue;
        }

        // Marquer comme en cours d'upload
        await updatePhotoStatus(photo.id, 'UPLOADING');
        this.emitStats();

        try {
          // 1. Upload vers Cloudinary
          const { url, thumbnailUrl } = await uploadToCloudinary(photo.blob);

          // 2. Enregistrer les métadonnées en BDD
          await axios.post(`/api/inspection/${this.inspectionId}/photos`, {
            ...photo.metadata,
            url,
            thumbnailUrl,
            sha256: photo.metadata.sha256,
          });

          // 3. Marquer comme uploadé
          await updatePhotoStatus(photo.id, 'UPLOADED', {
            cloudinaryUrl: url,
            thumbnailUrl,
          });
          this.emitStats();
        } catch (error) {
          console.warn('[PhotoQueue] Upload échoué, retry prévu:', error);
          // Upload échoué → retry plus tard
          await updatePhotoStatus(photo.id, 'FAILED');
          this.emitStats();

          // Attendre avec backoff exponentiel avant le prochain retry
          const delay = Math.min(
            BASE_RETRY_DELAY_MS * Math.pow(2, photo.retryCount),
            MAX_RETRY_DELAY_MS
          );
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private pause() {
    this.isProcessing = false;
  }

  private async emitStats() {
    if (!this.onStatusChange || !this.inspectionId) return;

    try {
      const db = await getDB();
      const all = await db.getAllFromIndex(
        'photos',
        'by-inspection',
        this.inspectionId
      );
      this.onStatusChange({
        total: all.length,
        pending: all.filter((p) => p.status === 'PENDING').length,
        uploading: all.filter((p) => p.status === 'UPLOADING').length,
        uploaded: all.filter((p) => p.status === 'UPLOADED').length,
        failed: all.filter((p) => p.status === 'FAILED').length,
      });
    } catch {
      // IndexedDB peut ne pas être disponible (SSR, etc.)
    }
  }

  /**
   * Retry manuel des photos en échec.
   */
  async retryFailed() {
    if (!this.inspectionId) return;

    const db = await getDB();
    const failed = (
      await db.getAllFromIndex('photos', 'by-inspection', this.inspectionId)
    ).filter((p) => p.status === 'FAILED');

    for (const photo of failed) {
      photo.status = 'PENDING';
      photo.retryCount = 0;
      await db.put('photos', photo);
    }

    this.emitStats();
    this.processQueue();
  }

  cleanup() {
    if (this.boundOnline) {
      window.removeEventListener('online', this.boundOnline);
    }
    if (this.boundOffline) {
      window.removeEventListener('offline', this.boundOffline);
    }
    this.boundOnline = null;
    this.boundOffline = null;
    this.inspectionId = null;
    this.onStatusChange = null;
  }
}

export const photoQueue = new PhotoQueueService();
