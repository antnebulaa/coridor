'use client';

import React from 'react';
import type { MoveInStepConfig } from '@/lib/moveInGuide';
import { PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/moveInGuide';

interface MoveInStoryStepProps {
  config: MoveInStepConfig;
}

const MoveInStoryStep: React.FC<MoveInStoryStepProps> = ({ config }) => {
  const priorityColor = PRIORITY_COLORS[config.priority];

  return (
    <div
      className="flex flex-col h-full px-6 pt-14 pb-6 animate-fadeUp overflow-y-auto"
      style={{ background: config.background }}
    >
      {/* Cercle emoji */}
      <div className="flex justify-center mb-6">
        <div
          className="w-[140px] h-[140px] rounded-full flex items-center justify-center"
          style={{
            backgroundColor: config.colorLight,
            border: `1px solid ${config.colorBorder}`,
            boxShadow: `0 8px 32px ${config.colorBorder}`,
          }}
        >
          <span className="text-[64px] leading-none">{config.emoji}</span>
        </div>
      </div>

      {/* Tag priorité */}
      <div className="flex justify-center mb-4">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold"
          style={{
            color: priorityColor.text,
            backgroundColor: priorityColor.bg,
            border: `1px solid ${priorityColor.border}`,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: priorityColor.text }}
          />
          {config.tag}
        </span>
      </div>

      {/* Headline */}
      <h2
        className="text-[28px] font-bold text-center leading-tight mb-3 whitespace-pre-line"
        style={{ color: '#1A1A1A' }}
      >
        {config.headline}
      </h2>

      {/* Description */}
      <p
        className="text-[15px] text-center leading-relaxed mb-6"
        style={{ color: 'rgba(0,0,0,0.5)' }}
      >
        {config.description}
      </p>

      {/* Card tips */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid rgba(0,0,0,0.05)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
        }}
      >
        {config.tips.map((tip, i) => (
          <div key={i} className="flex items-start gap-3">
            <div
              className="w-[18px] h-[18px] rounded-[6px] flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{
                backgroundColor: config.colorLight,
                border: `1px solid ${config.colorBorder}`,
              }}
            >
              <span
                className="text-[9px] font-bold leading-none"
                style={{ color: config.color }}
              >
                {i + 1}
              </span>
            </div>
            <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(0,0,0,0.5)' }}>
              {tip}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MoveInStoryStep;
