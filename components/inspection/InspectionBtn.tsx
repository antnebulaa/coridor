'use client';

import React from 'react';
import { EDL_THEME as t } from '@/lib/inspection-theme';

interface InspectionBtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const InspectionBtn: React.FC<InspectionBtnProps> = ({
  children,
  onClick,
  disabled = false,
  loading = false,
}) => {
  return (
    <div className={`flex-shrink-0 pt-3 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] bg-white ${t.border} border-t`}>
      <button
        onClick={disabled || loading ? undefined : onClick}
        disabled={disabled || loading}
        className={`w-full py-4 rounded-2xl text-[18px] font-medium tracking-tight active:scale-[0.98] ${
          disabled ? t.btnPrimaryDisabled : t.btnPrimary
        }`}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Sauvegarde...
          </span>
        ) : (
          children
        )}
      </button>
    </div>
  );
};

export default InspectionBtn;
