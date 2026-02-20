'use client';

import React from 'react';
import { CONDITIONS, EDL_COLORS } from '@/lib/inspection';
import type { ElementCondition } from '@prisma/client';

interface ConditionChipsProps {
  value?: ElementCondition | null;
  onChange: (condition: ElementCondition) => void;
  showAbsent?: boolean;
  isAbsent?: boolean;
  onAbsentToggle?: () => void;
  compact?: boolean;
}

const ConditionChips: React.FC<ConditionChipsProps> = ({
  value,
  onChange,
  showAbsent = false,
  isAbsent = false,
  onAbsentToggle,
  compact = false,
}) => {
  return (
    <div className="flex flex-wrap gap-2.5">
      {CONDITIONS.map((cond) => {
        const isSelected = value === cond.key && !isAbsent;
        return (
          <button
            key={cond.key}
            onClick={() => onChange(cond.key)}
            className={`rounded-2xl font-bold active:scale-95 ${
              compact ? 'px-4 py-2.5 text-[15px]' : 'px-5 py-3 text-[17px]'
            }`}
            style={{
              background: isSelected ? cond.color : EDL_COLORS.card2,
              color: isSelected ? '#000' : EDL_COLORS.text3,
              border: `2px solid ${isSelected ? cond.color : EDL_COLORS.border}`,
              opacity: isAbsent ? 0.3 : 1,
            }}
          >
            {compact ? cond.shortLabel : cond.label}
          </button>
        );
      })}
      {showAbsent && onAbsentToggle && (
        <button
          onClick={onAbsentToggle}
          className={`rounded-2xl font-bold active:scale-95 ${
            compact ? 'px-4 py-2.5 text-[15px]' : 'px-5 py-3 text-[17px]'
          }`}
          style={{
            background: isAbsent ? EDL_COLORS.text3 : EDL_COLORS.card2,
            color: isAbsent ? '#fff' : EDL_COLORS.text3,
            border: `2px solid ${isAbsent ? EDL_COLORS.text3 : EDL_COLORS.border}`,
          }}
        >
          Absent
        </button>
      )}
    </div>
  );
};

export default ConditionChips;
