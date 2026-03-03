'use client';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-red-500 text-white text-center py-2 text-sm font-medium pt-safe flex items-center justify-center gap-2">
      <WifiOff size={14} />
      Pas de connexion internet
    </div>
  );
}
