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
      {/* Desktop: full stepper */}
      <div className="hidden sm:flex items-start justify-between mb-10 relative">
        {/* Background line */}
        <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-neutral-200 dark:bg-neutral-700" />
        {/* Progress line */}
        <div
          className="absolute top-5 left-[10%] h-0.5 bg-(--sim-amber-400) transition-all duration-500 ease-out"
          style={{
            width: `${currentStep === 0 ? 0 : (currentStep / (steps.length - 1)) * 80}%`,
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
              className="relative z-10 flex flex-col items-center gap-2 w-1/4"
            >
              {/* Circle */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  isDone
                    ? 'bg-(--sim-amber-400) text-white'
                    : isCurrent
                      ? 'bg-(--sim-amber-400) text-white animate-[sim-pulse-shadow_2s_ease-in-out_infinite]'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500'
                }`}
              >
                {isDone ? <Check size={18} strokeWidth={2.5} /> : i + 1}
              </div>

              {/* Label */}
              <span
                className={`text-xs font-medium transition-colors ${
                  isFuture
                    ? 'text-neutral-400 dark:text-neutral-600'
                    : 'text-neutral-700 dark:text-neutral-300'
                }`}
              >
                {s.label}
              </span>

              {/* Completed summary */}
              {isDone && completedSummaries[i] && (
                <span className="text-[11px] text-neutral-400 dark:text-neutral-500 text-center leading-tight max-w-[140px]">
                  {completedSummaries[i]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile: dot progress */}
      <div className="flex sm:hidden items-center justify-center gap-3 mb-8">
        {/* Background line */}
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
