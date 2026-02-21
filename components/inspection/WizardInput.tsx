'use client';

import React, { useRef, useEffect, useState } from 'react';
import InspectionTopBar from './InspectionTopBar';
import InspectionBtn from './InspectionBtn';
import { EDL_COLORS } from '@/lib/inspection';

interface WizardInputProps {
  title: string;
  icon: string;
  label: string;
  hint?: string;
  inputMode?: 'text' | 'numeric' | 'decimal';
  value?: string;
  onNext: (value: string) => void;
  onBack: () => void;
  step: number;
  total: number;
  optional?: boolean;
}

const WizardInput: React.FC<WizardInputProps> = ({
  title,
  icon,
  label,
  hint,
  inputMode = 'text',
  value: initialValue = '',
  onNext,
  onBack,
  step,
  total,
  optional = false,
}) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const canContinue = optional || value.trim().length > 0;

  return (
    <div className="flex flex-col h-full" style={{ background: EDL_COLORS.bg }}>
      <InspectionTopBar
        title={title}
        onBack={onBack}
        step={{ current: step, total }}
      />

      <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fadeUp">
        {/* Icon */}
        <div className="text-[56px] mb-4">{icon}</div>

        {/* Label */}
        <div
          className="text-[26px] font-bold text-center mb-6 tracking-tight"
          style={{ color: EDL_COLORS.text }}
        >
          {label}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          inputMode={inputMode}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canContinue) onNext(value);
          }}
          placeholder={hint}
          className="w-full max-w-xs text-center text-[28px] font-bold py-4 bg-transparent outline-none"
          style={{
            color: EDL_COLORS.text,
            borderBottom: `3px solid ${value ? EDL_COLORS.accent : EDL_COLORS.border}`,
            caretColor: EDL_COLORS.accent,
          }}
        />

        {hint && !value && (
          <div className="mt-3 text-[16px]" style={{ color: EDL_COLORS.text3 }}>
            {hint}
          </div>
        )}
      </div>

      <InspectionBtn onClick={() => onNext(value)} disabled={!canContinue}>
        Suivant →
      </InspectionBtn>
    </div>
  );
};

export default WizardInput;
