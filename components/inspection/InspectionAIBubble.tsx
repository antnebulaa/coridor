'use client';

import React from 'react';
import { EDL_THEME as t } from '@/lib/inspection-theme';

interface InspectionAIBubbleProps {
  children: React.ReactNode;
}

const InspectionAIBubble: React.FC<InspectionAIBubbleProps> = ({ children }) => {
  return (
    <div className={`flex gap-2.5 p-3.5 rounded-[14px] mb-4 ${t.aiBubbleBg}`}>
      <div className={`w-7 h-7 rounded-[10px] flex items-center justify-center text-[14px] shrink-0 ${t.accentBgLight}`}>
        💡
      </div>
      <div className={`text-[15px] leading-relaxed ${t.aiBubbleText}`}>
        {children}
      </div>
    </div>
  );
};

export default InspectionAIBubble;
