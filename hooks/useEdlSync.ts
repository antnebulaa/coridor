'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { photoQueue, type QueueStats } from '@/lib/edl/photoQueue';
import { syncQueue } from '@/lib/edl/syncQueue';

export type { QueueStats } from '@/lib/edl/photoQueue';

/**
 * Hook orchestrateur de la synchronisation EDL.
 *
 * Combine photoQueue + syncQueue + détection réseau.
 * Utilisé dans le layout d'inspection et la page de signature.
 */
export function useEdlSync(inspectionId: string) {
  const [photoStats, setPhotoStats] = useState<QueueStats>({
    total: 0,
    pending: 0,
    uploading: 0,
    uploaded: 0,
    failed: 0,
  });
  const [pendingMutations, setPendingMutations] = useState(0);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Track "just synced" state for the success message
  const [justSynced, setJustSynced] = useState(false);
  const justSyncedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasUnsyncedRef = useRef(false);

  const isSynced =
    photoStats.pending === 0 &&
    photoStats.uploading === 0 &&
    photoStats.failed === 0 &&
    pendingMutations === 0;

  // Detect transition from unsynced to synced
  useEffect(() => {
    if (!isSynced) {
      wasUnsyncedRef.current = true;
    } else if (wasUnsyncedRef.current && photoStats.total > 0) {
      // We were unsynced and now we're synced — show success message
      wasUnsyncedRef.current = false;
      setJustSynced(true);
      justSyncedTimeout.current = setTimeout(() => {
        setJustSynced(false);
      }, 3000);
    }
  }, [isSynced, photoStats.total]);

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
      if (justSyncedTimeout.current) {
        clearTimeout(justSyncedTimeout.current);
      }
    };
  }, [inspectionId]);

  const retryFailed = useCallback(() => {
    photoQueue.retryFailed();
  }, []);

  return {
    photoStats,
    pendingMutations,
    isOnline,
    isSynced,
    justSynced,
    retryFailed,
  };
}
