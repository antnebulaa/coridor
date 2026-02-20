'use client';

import React from 'react';
import { SURFACE_NATURES, EDL_COLORS } from '@/lib/inspection';
import type { ElementCategory } from '@prisma/client';

interface NatureSelectorProps {
  category: 'FLOOR' | 'WALL' | 'CEILING';
  value?: string | null;
  onChange: (nature: string) => void;
}

const NatureSelector: React.FC<NatureSelectorProps> = ({ category, value, onChange }) => {
  const options = SURFACE_NATURES[category] || [];

  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((nature) => {
        const isSelected = value === nature;
        return (
          <button
            key={nature}
            onClick={() => onChange(nature)}
            className="px-5 py-3 rounded-2xl text-[17px] font-bold active:scale-95"
            style={{
              background: isSelected ? EDL_COLORS.accent : EDL_COLORS.card2,
              color: isSelected ? '#000' : EDL_COLORS.text2,
              border: `2px solid ${isSelected ? EDL_COLORS.accent : EDL_COLORS.border}`,
            }}
          >
            {nature}
          </button>
        );
      })}
    </div>
  );
};

export default NatureSelector;
