'use client';

import React from 'react';
import { useRouter } from '@/i18n/navigation';
import { ChevronLeft, X } from 'lucide-react';
import { EDL_THEME as t } from '@/lib/inspection-theme';

interface InspectionTopBarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onClose?: () => void;
  right?: React.ReactNode;
  step?: { current: number; total: number };
}

const InspectionTopBar: React.FC<InspectionTopBarProps> = ({
  title,
  subtitle,
  onBack,
  onClose,
  right,
  step,
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  return (
    <div className={`flex-shrink-0 ${t.topBarBg}`}>
      <div className="flex items-center gap-3 px-5 py-3">
        <button
          onClick={handleBack}
          className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center active:scale-95 ${t.btnSecondary}`}
        >
          <ChevronLeft size={24} className={t.textPrimary} />
        </button>
        <div className="flex-1 min-w-0">
          <div className={`text-[20px] font-bold tracking-tight truncate ${t.topBarTitle}`}>
            {title}
          </div>
          {subtitle && (
            <div className={`text-[14px] mt-0.5 ${t.topBarSubtitle}`}>
              {subtitle}
            </div>
          )}
        </div>
        {step && (
          <div className={`text-[14px] font-bold px-3 py-1.5 rounded-full ${t.btnSecondary}`}>
            {step.current}/{step.total}
          </div>
        )}
        {right}
        {onClose && (
          <button
            onClick={onClose}
            className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center active:scale-95 bg-gray-200`}
          >
            <X size={18} className={t.btnClose} />
          </button>
        )}
      </div>
    </div>
  );
};

export default InspectionTopBar;
