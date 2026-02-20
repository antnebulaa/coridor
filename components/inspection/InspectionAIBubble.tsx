'use client';

import React from 'react';
import { EDL_COLORS } from '@/lib/inspection';

interface InspectionAIBubbleProps {
  children: React.ReactNode;
}

const InspectionAIBubble: React.FC<InspectionAIBubbleProps> = ({ children }) => {
  return (
    <div
      className="flex gap-2.5 p-3.5 rounded-[14px] mb-4"
      style={{
        background: `${EDL_COLORS.accent}0C`,
        border: `1px solid ${EDL_COLORS.accent}22`,
      }}
    >
      <div
        className="w-7 h-7 rounded-[10px] flex items-center justify-center text-[14px] flex-shrink-0"
        style={{ background: `${EDL_COLORS.accent}20` }}
      >
        💡
      </div>
      <div className="text-[15px] leading-relaxed" style={{ color: EDL_COLORS.text2 }}>
        {children}
      </div>
    </div>
  );
};

export default InspectionAIBubble;
