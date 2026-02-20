'use client';

import { EDL_COLORS } from '@/lib/inspection';

export default function InspectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Outer: covers full viewport including behind status bar — dark bg visible through translucent status bar
    <div className="fixed inset-0" style={{ background: EDL_COLORS.bg }}>
      {/* Inner: pt-safe pushes content below iOS status bar, pb-safe clears home indicator */}
      <div className="h-full flex flex-col pt-safe pb-safe overflow-hidden">
        {children}
      </div>
    </div>
  );
}
