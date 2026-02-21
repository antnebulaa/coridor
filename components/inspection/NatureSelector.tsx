'use client';

import React from 'react';
import { SURFACE_NATURES, EDL_COLORS } from '@/lib/inspection';

interface NatureSelectorProps {
  category: 'FLOOR' | 'WALL' | 'CEILING';
  value?: string[];
  onChange: (natures: string[]) => void;
}

const NatureSelector: React.FC<NatureSelectorProps> = ({ category, value = [], onChange }) => {
  const options = SURFACE_NATURES[category] || [];

  const handleToggle = (nature: string) => {
    if (value.includes(nature)) {
      onChange(value.filter((n) => n !== nature));
    } else {
      onChange([...value, nature]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((nature) => {
        const isSelected = value.includes(nature);
        return (
          <button
            key={nature}
            onClick={() => handleToggle(nature)}
            className="px-5 py-3 rounded-2xl text-[17px] font-bold active:scale-95"
            style={{
              background: isSelected ? EDL_COLORS.accent : EDL_COLORS.card2,
              color: isSelected ? '#fff' : EDL_COLORS.text2,
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
