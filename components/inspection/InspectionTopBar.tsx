'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { ChevronLeft } from 'lucide-react';
import { EDL_COLORS } from '@/lib/inspection';

interface InspectionTopBarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  step?: { current: number; total: number };
}

const InspectionTopBar: React.FC<InspectionTopBarProps> = ({
  title,
  subtitle,
  onBack,
  right,
  step,
}) => {
  const router = useRouter();
  const [topPad, setTopPad] = useState(60);

  useEffect(() => {
    // Read actual safe area from a temporary element (works in PWA + Safari)
    const el = document.createElement('div');
    el.style.paddingTop = 'env(safe-area-inset-top, 0px)';
    el.style.position = 'fixed';
    el.style.visibility = 'hidden';
    document.body.appendChild(el);
    const computed = parseInt(getComputedStyle(el).paddingTop, 10) || 0;
    document.body.removeChild(el);
    setTopPad(Math.max(computed + 12, 60));
  }, []);

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  return (
    <div
      className="flex-shrink-0"
      style={{
        paddingTop: topPad,
        background: EDL_COLORS.bg,
        borderBottom: `1px solid ${EDL_COLORS.border}`,
      }}
    >
      <div className="flex items-center gap-3 px-5 py-3">
        <button
          onClick={handleBack}
          className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center active:scale-95"
          style={{ background: EDL_COLORS.card }}
        >
          <ChevronLeft size={24} color={EDL_COLORS.text} />
        </button>
        <div className="flex-1 min-w-0">
          <div
            className="text-[20px] font-bold tracking-tight truncate"
            style={{ color: EDL_COLORS.text }}
          >
            {title}
          </div>
          {subtitle && (
            <div className="text-[14px] mt-0.5" style={{ color: EDL_COLORS.text2 }}>
              {subtitle}
            </div>
          )}
        </div>
        {step && (
          <div
            className="text-[14px] font-bold px-3 py-1.5 rounded-full"
            style={{ background: EDL_COLORS.card, color: EDL_COLORS.text2 }}
          >
            {step.current}/{step.total}
          </div>
        )}
        {right}
      </div>
    </div>
  );
};

export default InspectionTopBar;
