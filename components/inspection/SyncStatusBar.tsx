'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { QueueStats } from '@/hooks/useEdlSync';
import { Wifi, WifiOff, AlertTriangle, Check, Loader2 } from 'lucide-react';

interface SyncStatusBarProps {
  photoStats: QueueStats;
  pendingMutations: number;
  isOnline: boolean;
  isSynced: boolean;
  justSynced: boolean;
  onRetry: () => void;
}

/**
 * Barre de statut de synchronisation affichée en haut des pages EDL.
 *
 * 5 états visuels :
 * 1. Tout synced (hidden)
 * 2. Upload en cours (progress bar)
 * 3. Hors ligne (message rassurant)
 * 4. Photos en échec (bouton retry)
 * 5. Tout synced après retour en ligne (auto-dismiss 3s)
 */
export default function SyncStatusBar({
  photoStats,
  pendingMutations,
  isOnline,
  isSynced,
  justSynced,
  onRetry,
}: SyncStatusBarProps) {
  const t = useTranslations('inspection.sync');

  // State 1: All synced and no "just synced" animation — hidden
  if (isSynced && !justSynced) {
    return null;
  }

  // State 5: Just synced — success message that auto-dismisses
  if (isSynced && justSynced) {
    return (
      <div className="mx-4 mt-2 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 px-4 py-2.5 flex items-center gap-2 transition-all duration-300 animate-in fade-in slide-in-from-top-2">
        <Check size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          {t('synced')}
        </span>
      </div>
    );
  }

  // State 4: Photos failed (after max retries)
  if (photoStats.failed > 0 && isOnline) {
    return (
      <div className="mx-4 mt-2 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-2.5 flex items-center justify-between gap-3 transition-all duration-300">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300 truncate">
            {t('failed', { count: photoStats.failed })}
          </span>
        </div>
        <button
          onClick={onRetry}
          className="text-sm font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-3 py-1.5 rounded-lg shrink-0 active:scale-95 transition-transform"
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  // State 3: Offline with pending data
  if (!isOnline) {
    const photoPending = photoStats.pending + photoStats.uploading + photoStats.failed;
    return (
      <div className="mx-4 mt-2 rounded-xl border border-neutral-200 bg-neutral-100 dark:bg-neutral-800 dark:border-neutral-700 px-4 py-2.5 transition-all duration-300">
        <div className="flex items-center gap-2">
          <WifiOff size={16} className="text-neutral-500 dark:text-neutral-400 shrink-0" />
          <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            {t('offline')}
          </span>
        </div>
        {(photoPending > 0 || pendingMutations > 0) && (
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {t('offlineDetail', { photos: photoPending, mutations: pendingMutations })}
            </span>
          </div>
        )}
        <div className="mt-1 flex items-center gap-1.5">
          <Check size={14} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {t('savedLocally')}
          </span>
        </div>
      </div>
    );
  }

  // State 2: Upload in progress
  const uploading = photoStats.uploading + photoStats.pending > 0;
  if (uploading) {
    const current = photoStats.uploaded;
    const total = photoStats.total - photoStats.failed;
    const progress = total > 0 ? Math.round((current / total) * 100) : 0;

    return (
      <div className="mx-4 mt-2 rounded-xl border border-amber-100 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-2.5 transition-all duration-300">
        <div className="flex items-center gap-2 mb-2">
          <Loader2 size={16} className="text-amber-600 dark:text-amber-400 shrink-0 animate-spin" />
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
            {t('uploading', { current, total })}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-amber-100 dark:bg-amber-900/50 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  // Fallback: mutations pending but no photo activity
  if (pendingMutations > 0) {
    return (
      <div className="mx-4 mt-2 rounded-xl border border-amber-100 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-2.5 flex items-center gap-2 transition-all duration-300">
        <Loader2 size={16} className="text-amber-600 dark:text-amber-400 shrink-0 animate-spin" />
        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
          {t('mutationPending', { count: pendingMutations })}
        </span>
      </div>
    );
  }

  return null;
}
