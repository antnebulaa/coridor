'use client';

import React, { useState } from 'react';
import { ChevronDown, ExternalLink, Check } from 'lucide-react';
import type { MoveInStepConfig, MoveInStep } from '@/lib/moveInGuide';
import { PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/moveInGuide';

interface MoveInChecklistItemProps {
  config: MoveInStepConfig;
  step: MoveInStep;
  onToggle: () => void;
  dynamicCtaUrl?: string;
}

const MoveInChecklistItem: React.FC<MoveInChecklistItemProps> = ({ config, step, onToggle, dynamicCtaUrl }) => {
  const [expanded, setExpanded] = useState(false);
  const pColor = PRIORITY_COLORS[config.priority];
  const ctaUrl = dynamicCtaUrl || config.ctaUrl;

  return (
    <div
      className={`rounded-xl border transition-all ${step.completed ? 'opacity-60' : ''}`}
      style={{ borderColor: 'rgba(0,0,0,0.06)' }}
    >
      {/* Main row */}
      <div
        className="flex items-center gap-3 p-3.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="w-[22px] h-[22px] rounded-full border flex items-center justify-center shrink-0 transition-colors"
          style={{
            borderColor: step.completed ? '#008A00' : 'rgba(0,0,0,0.15)',
            backgroundColor: step.completed ? '#008A00' : 'transparent',
          }}
        >
          {step.completed && <Check size={12} className="text-white" strokeWidth={3} />}
        </button>

        {/* Emoji */}
        <span className="text-[20px] shrink-0">{config.emoji}</span>

        {/* Title */}
        <p className={`text-[19px] font-medium flex-1 min-w-0 ${step.completed ? 'line-through text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
          {config.title}
        </p>

        {/* Priority tag */}
        <span
          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
          style={{
            color: pColor.text,
            backgroundColor: pColor.bg,
            border: `1px solid ${pColor.border}`,
          }}
        >
          {PRIORITY_LABELS[config.priority]}
        </span>

        {/* Expand chevron */}
        <ChevronDown
          size={16}
          className={`text-neutral-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3.5 pb-3.5 pt-0 border-t" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
          <p className="text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400 mt-3 mb-3">
            {config.description}
          </p>

          {/* Tips numérotés */}
          <div className="space-y-2 mb-3">
            {config.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div
                  className="w-[18px] h-[18px] rounded-[6px] flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    backgroundColor: config.colorLight,
                    border: `1px solid ${config.colorBorder}`,
                  }}
                >
                  <span className="text-[9px] font-bold" style={{ color: config.color }}>
                    {i + 1}
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {tip}
                </p>
              </div>
            ))}
          </div>

          {/* CTA externe */}
          {config.ctaLabel && ctaUrl && (
            <a
              href={ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors"
              style={{ color: config.color }}
              onClick={(e) => e.stopPropagation()}
            >
              {config.ctaLabel}
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default MoveInChecklistItem;
