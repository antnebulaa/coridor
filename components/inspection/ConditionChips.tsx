'use client';

import React, { useState, useEffect } from 'react';
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
            className={`rounded-2xl font-bold transition-transform active:scale-95 ${
              compact ? 'px-4 py-2.5 text-[15px]' : 'px-5 py-3 text-[17px]'
            }`}
            style={{
              background: isSelected ? cond.color : EDL_COLORS.card2,
              color: isSelected ? '#000' : EDL_COLORS.text3,
              border: `2px solid ${isSelected ? cond.color : EDL_COLORS.border}`,
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
          className={`rounded-2xl font-bold transition-transform active:scale-95 ${
            compact ? 'px-4 py-2.5 text-[15px]' : 'px-5 py-3 text-[17px]'
          }`}
          style={{
            background: optimisticAbsent ? EDL_COLORS.text3 : EDL_COLORS.card2,
            color: optimisticAbsent ? '#fff' : EDL_COLORS.text3,
            border: `2px solid ${optimisticAbsent ? EDL_COLORS.text3 : EDL_COLORS.border}`,
          }}
        >
          Absent
        </button>
      )}
    </div>
  );
};

export default ConditionChips;
