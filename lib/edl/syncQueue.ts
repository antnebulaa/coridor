import axios from 'axios';
import { getPendingMutations, updateMutationStatus } from '@/lib/edl/offlineStorage';

// ─── Constants ───

const MAX_RETRIES = 3;

// ─── Service ───

/**
 * SyncQueue — Synchronise les mutations API en background.
 *
 * Fonctionne en complément de photoQueue :
 * - photoQueue gère les uploads de photos (Cloudinary + métadonnées)
 * - syncQueue gère les mutations de données (conditions, natures, observations, compteurs, clés)
 *
 * Les mutations sont traitées dans l'ordre chronologique (FIFO).
 * Si une mutation échoue après 3 retries, on passe à la suivante (pas de blocage).
 */
class SyncQueueService {
  private isProcessing = false;
  private inspectionId: string | null = null;
  private onStatusChange: ((pending: number) => void) | null = null;
  private boundOnline: (() => void) | null = null;

  init(inspectionId: string, onStatusChange: (pending: number) => void) {
    this.inspectionId = inspectionId;
    this.onStatusChange = onStatusChange;

    this.boundOnline = () => this.processQueue();
    window.addEventListener('online', this.boundOnline);

    if (navigator.onLine) {
      this.processQueue();
    }

    // Émettre les stats initiales
    this.emitStats();
  }

  async processQueue() {
    if (this.isProcessing || !this.inspectionId || !navigator.onLine) return;
    this.isProcessing = true;

    try {
      const pending = await getPendingMutations(this.inspectionId);

      for (const mutation of pending) {
        if (!navigator.onLine) break;

        if (mutation.retryCount >= MAX_RETRIES) {
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

    try {
      const pending = await getPendingMutations(this.inspectionId);
      this.onStatusChange(pending.length);
    } catch {
      // IndexedDB peut ne pas être disponible
    }
  }

  cleanup() {
    if (this.boundOnline) {
      window.removeEventListener('online', this.boundOnline);
    }
    this.boundOnline = null;
    this.inspectionId = null;
    this.onStatusChange = null;
  }
}

export const syncQueue = new SyncQueueService();
