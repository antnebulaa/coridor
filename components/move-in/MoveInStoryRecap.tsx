'use client';

import React from 'react';
import { MOVE_IN_STEPS_CONFIG, PRIORITY_COLORS, STORY_SPECIAL_BACKGROUND } from '@/lib/moveInGuide';

interface MoveInStoryRecapProps {
  onComplete: () => void;
}

const MoveInStoryRecap: React.FC<MoveInStoryRecapProps> = ({ onComplete }) => {
  return (
    <div
      className="flex flex-col items-center h-full px-6 pt-12 pb-6 animate-scaleIn overflow-y-auto"
      style={{ background: STORY_SPECIAL_BACKGROUND }}
    >
      {/* Emoji */}
      <div className="text-[64px] mb-3">✅</div>

      {/* Titre */}
      <h1 className="text-[28px] font-bold text-[#1A1A1A] text-center leading-tight mb-2">
        Tout est prêt !
      </h1>
      <p className="text-[15px] text-center leading-relaxed mb-6" style={{ color: 'rgba(0,0,0,0.5)' }}>
        Votre checklist est dans « Mon logement ».{'\n'}On vous enverra des rappels aux bons moments.
      </p>

      {/* Mini-liste des 8 étapes */}
      <div
        className="w-full rounded-2xl p-4 space-y-2.5 mb-6"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}
      >
        {MOVE_IN_STEPS_CONFIG.map((step) => {
          const pColor = PRIORITY_COLORS[step.priority];
          return (
            <div key={step.id} className="flex items-center gap-3 py-1">
              <span className="text-[18px]">{step.emoji}</span>
              <span className="text-[13px] font-medium text-[#1A1A1A] flex-1">{step.title}</span>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  color: pColor.text,
                  backgroundColor: pColor.bg,
                  border: `1px solid ${pColor.border}`,
                }}
              >
                {step.tag.split(' · ')[0]}
              </span>
              {/* Checkbox vide */}
              <div
                className="w-[18px] h-[18px] rounded-full border flex-shrink-0"
                style={{ borderColor: 'rgba(0,0,0,0.1)' }}
              />
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <button
        onClick={onComplete}
        className="w-full py-3.5 rounded-2xl text-white font-semibold text-[15px] transition-transform active:scale-[0.97]"
        style={{
          backgroundColor: '#E8A838',
          boxShadow: '0 4px 16px rgba(232,168,56,0.3)',
        }}
      >
        Voir ma checklist complète
      </button>
    </div>
  );
};

export default MoveInStoryRecap;
