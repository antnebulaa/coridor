'use client';

import { useParams } from 'next/navigation';
import { EDL_THEME as t } from '@/lib/inspection-theme';
import { useEdlSync } from '@/hooks/useEdlSync';
import SyncStatusBar from '@/components/inspection/SyncStatusBar';

export default function InspectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const inspectionId = params?.inspectionId as string | undefined;

  return (
    // Outer: covers full viewport including behind status bar
    <div className={`fixed inset-0 z-[10000] ${t.bgPage}`}>
      {/* Inner: pt-safe pushes content below iOS status bar, pb-safe clears home indicator */}
      <div className="h-full flex flex-col pt-safe pb-safe overflow-hidden">
        {inspectionId && <SyncStatusBarWrapper inspectionId={inspectionId} />}
        {children}
      </div>
    </div>
  );
}

/** Wrapper to call the hook (hooks can't be conditional) */
function SyncStatusBarWrapper({ inspectionId }: { inspectionId: string }) {
  const { photoStats, pendingMutations, isOnline, isSynced, justSynced, retryFailed } =
    useEdlSync(inspectionId);

  return (
    <SyncStatusBar
      photoStats={photoStats}
      pendingMutations={pendingMutations}
      isOnline={isOnline}
      isSynced={isSynced}
      justSynced={justSynced}
      onRetry={retryFailed}
    />
  );
}
