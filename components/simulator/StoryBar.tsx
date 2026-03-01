'use client';

import { Check } from 'lucide-react';

interface StoryBarProps {
  currentStep: number;
  steps: { key: string; label: string; icon: React.ComponentType<{ size: number }> }[];
  completedSummaries: Record<number, string>;
  onStepClick: (step: number) => void;
}

export function StoryBar({ currentStep, steps, completedSummaries, onStepClick }: StoryBarProps) {
  return (
    <>
      {/* Desktop: compact stepper */}
      <div className="hidden sm:flex items-start justify-between mb-8 relative">
        {/* Background line */}
        <div className="absolute top-4 left-[10%] right-[10%] h-[3px] bg-neutral-200 dark:bg-neutral-700 rounded-full" />
        {/* Progress line — gradient */}
        <div
          className="absolute top-4 left-[10%] h-[3px] rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${currentStep === 0 ? 0 : (currentStep / (steps.length - 1)) * 80}%`,
            background: 'linear-gradient(to right, var(--sim-amber-400), var(--sim-amber-600))',
          }}
        />

        {steps.map((s, i) => {
          const isDone = i < currentStep;
          const isCurrent = i === currentStep;
          const isFuture = i > currentStep;

          return (
            <button
              key={s.key}
              onClick={() => onStepClick(i)}
              className="relative z-10 flex flex-col items-center gap-1.5 w-1/4"
            >
              {/* Circle */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                  isDone
                    ? 'bg-(--sim-amber-400) text-white'
                    : isCurrent
                      ? 'bg-(--sim-amber-400) text-white animate-[sim-pulse-shadow_2s_ease-in-out_infinite]'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500'
                }`}
              >
                {isDone ? <Check size={14} strokeWidth={2.5} /> : i + 1}
              </div>

              {/* Label */}
              <span
                className={`text-[11px] font-medium transition-colors ${
                  isFuture
                    ? 'text-neutral-400 dark:text-neutral-600'
                    : 'text-neutral-700 dark:text-neutral-300'
                }`}
              >
                {s.label}
              </span>

              {/* Completed summary — single line truncated */}
              {isDone && completedSummaries[i] && (
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate max-w-[120px]">
                  {completedSummaries[i]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile: dot progress */}
      <div className="flex sm:hidden items-center justify-center gap-3 mb-8">
        <div className="relative flex items-center gap-3">
          {steps.map((s, i) => {
            const isDone = i < currentStep;
            const isCurrent = i === currentStep;

            return (
              <button
                key={s.key}
                onClick={() => onStepClick(i)}
                className="relative z-10"
              >
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    isDone
                      ? 'bg-(--sim-amber-400)'
                      : isCurrent
                        ? 'bg-(--sim-amber-400) scale-125'
                        : 'bg-neutral-300 dark:bg-neutral-600'
                  }`}
                />
              </button>
            );
          })}
        </div>
        <span className="text-xs text-neutral-400 dark:text-neutral-500 ml-2">
          {currentStep + 1}/{steps.length}
        </span>
      </div>
    </>
  );
}
