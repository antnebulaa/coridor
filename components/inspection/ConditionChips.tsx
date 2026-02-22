'use client';

import React, { useState, useEffect } from 'react';
import { CONDITIONS } from '@/lib/inspection';
import { EDL_THEME as t } from '@/lib/inspection-theme';
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
  // Optimistic local state for instant UI feedback
  const [optimisticValue, setOptimisticValue] = useState(value);
  const [optimisticAbsent, setOptimisticAbsent] = useState(isAbsent);

  useEffect(() => { setOptimisticValue(value); }, [value]);
  useEffect(() => { setOptimisticAbsent(isAbsent); }, [isAbsent]);

  return (
    <div className="flex flex-wrap gap-2.5">
      {CONDITIONS.map((cond) => {
        const isSelected = optimisticValue === cond.key && !optimisticAbsent;
        return (
          <button
            key={cond.key}
            onClick={() => {
              setOptimisticValue(cond.key);
              setOptimisticAbsent(false);
              onChange(cond.key);
            }}
            className={`rounded-2xl font-medium transition-transform active:scale-95 ${
              compact ? 'px-4 py-2.5 text-[15px]' : 'px-5 py-3 text-[17px]'
            } ${isSelected ? t.chipSelected : t.chipDefault}`}
            style={{
              ...(isSelected ? { background: cond.color, borderColor: cond.color } : {}),
              opacity: optimisticAbsent ? 0.3 : 1,
            }}
          >
            {compact ? cond.shortLabel : cond.label}
          </button>
        );
      })}
      {showAbsent && onAbsentToggle && (
        <button
          onClick={() => {
            setOptimisticAbsent(!optimisticAbsent);
            onAbsentToggle();
          }}
          className={`rounded-2xl font-medium transition-transform active:scale-95 ${
            compact ? 'px-4 py-2.5 text-[15px]' : 'px-5 py-3 text-[17px]'
          } ${optimisticAbsent ? 'bg-gray-500 text-white border-2 border-gray-500' : t.chipDefault}`}
        >
          Absent
        </button>
      )}
    </div>
  );
};

export default ConditionChips;
