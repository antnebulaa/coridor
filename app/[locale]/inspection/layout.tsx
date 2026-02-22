'use client';

import { EDL_THEME as t } from '@/lib/inspection-theme';

export default function InspectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Outer: covers full viewport including behind status bar
    <div className={`fixed inset-0 z-[10000] ${t.bgPage}`}>
      {/* Inner: pt-safe pushes content below iOS status bar, pb-safe clears home indicator */}
      <div className="h-full flex flex-col pt-safe pb-safe overflow-hidden">
        {children}
      </div>
    </div>
  );
}
