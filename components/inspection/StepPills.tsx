'use client';

import React, { useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { EDL_THEME as t } from '@/lib/inspection-theme';

export interface StepDef {
  key: string;
  label: string;
  status: 'done' | 'active' | 'todo';
  completed?: boolean; // true if step has data, even when active
}

interface StepPillsProps {
  steps: StepDef[];
  onStepSelect: (stepKey: string) => void;
}

const StepPills: React.FC<StepPillsProps> = ({ steps, onStepSelect }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to center the active pill
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const pill = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const pillRect = pill.getBoundingClientRect();
      const scrollLeft =
        pill.offsetLeft - container.offsetLeft - containerRect.width / 2 + pillRect.width / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [steps]);

  return (
    <div className={`shrink-0 ${t.stepPillContainer}`}>
      <div
        ref={scrollRef}
        className="flex gap-2 px-4 py-2 overflow-x-auto no-scrollbar"
      >
        {steps.map((step) => {
          const isActive = step.status === 'active';
          const isDone = step.status === 'done';

          const pillClass = isActive
            ? t.stepPillActive
            : isDone
              ? t.stepPillDone
              : t.stepPillTodo;

          return (
            <button
              key={step.key}
              ref={isActive ? activeRef : undefined}
              onClick={() => onStepSelect(step.key)}
              className={`shrink-0 flex items-center gap-1 px-4 py-2.5 rounded-full text-[13px] font-medium whitespace-nowrap ${pillClass}`}
            >
              {step.label}
              {(isDone || (isActive && step.completed)) && <Check size={12} strokeWidth={3} />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StepPills;
