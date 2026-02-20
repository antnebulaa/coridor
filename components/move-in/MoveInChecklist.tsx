'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';
import MoveInChecklistItem from './MoveInChecklistItem';
import { MOVE_IN_STEPS_CONFIG, getCompletedCount, type MoveInStep, type MoveInStepId } from '@/lib/moveInGuide';

interface MoveInChecklistProps {
  steps: MoveInStep[];
  onToggleStep: (stepId: MoveInStepId) => void;
  onReplayStories: () => void;
  propertyAddress?: string;
}

const MoveInChecklist: React.FC<MoveInChecklistProps> = ({ steps, onToggleStep, onReplayStories, propertyAddress }) => {
  const completedCount = getCompletedCount(steps);
  const totalSteps = steps.length;
  const allDone = completedCount === totalSteps;

  // Sort: incomplete first (by priority order), completed last
  const sortedConfigs = [...MOVE_IN_STEPS_CONFIG].sort((a, b) => {
    const stepA = steps.find(s => s.id === a.id);
    const stepB = steps.find(s => s.id === b.id);
    if (stepA?.completed && !stepB?.completed) return 1;
    if (!stepA?.completed && stepB?.completed) return -1;
    return 0;
  });

  // Build dynamic CTA URL for "quartier" step
  const quartierCtaUrl = propertyAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(propertyAddress)}`
    : undefined;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📦</span>
          <h3 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100">
            Votre emménagement
          </h3>
        </div>
        <span className="text-[13px] font-medium text-neutral-500">
          {completedCount}/{totalSteps} étapes
        </span>
      </div>

      {/* Description */}
      <p className="text-[20px] font-medium text-neutral-800 dark:text-neutral-400 leading-relaxed -mt-1">
        Félicitations pour votre nouveau logement !<br/>Pour vous faire gagner du temps, voici un récap des choses à faire les premiers jours.
      </p>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${(completedCount / totalSteps) * 100}%`,
            backgroundColor: '#008A00',
          }}
        />
      </div>

      {/* All done message */}
      {allDone && (
        <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#F0FAF3' }}>
          <span className="text-2xl">🎉</span>
          <p className="text-[14px] font-medium text-[#2D9F4F] mt-1">
            Tout est en ordre ! Profitez bien de votre nouveau logement.
          </p>
        </div>
      )}

      {/* Steps list */}
      <div className="space-y-2">
        {sortedConfigs.map((config) => {
          const step = steps.find(s => s.id === config.id);
          if (!step) return null;

          return (
            <MoveInChecklistItem
              key={config.id}
              config={config}
              step={step}
              onToggle={() => onToggleStep(config.id)}
              dynamicCtaUrl={config.id === 'quartier' ? quartierCtaUrl : undefined}
            />
          );
        })}
      </div>

      {/* Replay stories button */}
      <button
        onClick={onReplayStories}
        className="flex items-center gap-2 w-full py-3 justify-center rounded-xl text-[13px] font-medium text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
        style={{ border: '1px solid rgba(0,0,0,0.06)' }}
      >
        <RotateCcw size={14} />
        Revoir le guide d&apos;emménagement
      </button>
    </div>
  );
};

export default MoveInChecklist;
