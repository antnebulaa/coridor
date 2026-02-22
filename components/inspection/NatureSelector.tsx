'use client';

import React from 'react';
import { SURFACE_NATURES } from '@/lib/inspection';
import { EDL_THEME as t } from '@/lib/inspection-theme';

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
            className={`px-5 py-3 rounded-2xl text-[17px] font-medium active:scale-95 ${
              isSelected ? t.natureChipSelected : t.natureChipDefault
            }`}
          >
            {nature}
          </button>
        );
      })}
    </div>
  );
};

export default NatureSelector;
