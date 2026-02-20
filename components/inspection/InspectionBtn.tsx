'use client';

import React from 'react';
import { EDL_COLORS } from '@/lib/inspection';

interface InspectionBtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  color?: string;
  textColor?: string;
  loading?: boolean;
}

const InspectionBtn: React.FC<InspectionBtnProps> = ({
  children,
  onClick,
  disabled = false,
  color = EDL_COLORS.accent,
  textColor = '#000',
  loading = false,
}) => {
  return (
    <div
      className="flex-shrink-0 pt-3 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)]"
      style={{
        borderTop: `1px solid ${EDL_COLORS.border}`,
        background: EDL_COLORS.bg,
      }}
    >
      <button
        onClick={disabled || loading ? undefined : onClick}
        disabled={disabled || loading}
        className="w-full py-4 rounded-2xl text-[18px] font-bold tracking-tight active:scale-[0.98]"
        style={{
          background: disabled ? EDL_COLORS.card2 : color,
          color: disabled ? EDL_COLORS.text3 : textColor,
          border: disabled ? `1px solid ${EDL_COLORS.border}` : 'none',
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'default' : 'pointer',
        }}
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
