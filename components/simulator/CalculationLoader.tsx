'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Home, CheckCircle } from 'lucide-react';

interface CalculationLoaderProps {
  projectionYears: number;
  onComplete: () => void;
}

const LOADER_STEPS = [
  'Calcul des rendements',
  'Comparaison des régimes fiscaux',
  'Projection sur {N} ans',
  'Analyse terminée !',
];

const STEP_DELAY = 450;
const TOTAL_DURATION = 1800;

export function CalculationLoader({ projectionYears, onComplete }: CalculationLoaderProps) {
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [checkedSteps, setCheckedSteps] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const progressStart = performance.now();
    let raf: number;
    const animateProgress = (now: number) => {
      const elapsed = now - progressStart;
      const p = Math.min(elapsed / TOTAL_DURATION, 1);
      setProgress(1 - Math.pow(1 - p, 2));
      if (p < 1) raf = requestAnimationFrame(animateProgress);
    };
    raf = requestAnimationFrame(animateProgress);

    const timers: NodeJS.Timeout[] = [];
    for (let i = 0; i < LOADER_STEPS.length; i++) {
      timers.push(setTimeout(() => setVisibleSteps(i + 1), i * STEP_DELAY));
      timers.push(setTimeout(() => setCheckedSteps(i + 1), i * STEP_DELAY + 300));
    }

    timers.push(setTimeout(onComplete, TOTAL_DURATION + 200));

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, [onComplete, projectionYears]);

  const steps = LOADER_STEPS.map((s) =>
    s.replace('{N}', String(projectionYears))
  );

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />

      {/* Card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl p-8 md:p-10 mx-4 max-w-sm w-full flex flex-col items-center"
      >
        {/* House icon */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
          className="w-16 h-16 rounded-2xl bg-(--sim-amber-50) flex items-center justify-center mb-6"
        >
          <Home size={28} className="text-(--sim-amber-500)" />
        </motion.div>

        {/* Title */}
        <h3
          className="text-xl md:text-2xl text-neutral-900 dark:text-white mb-8 text-center"
          style={{ fontFamily: 'var(--font-serif-sim), serif' }}
        >
          Analyse de votre investissement...
        </h3>

        {/* Progress bar */}
        <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden mb-8">
          <div
            className="h-full bg-linear-to-r from-[#E8A838] to-[#D4922A] rounded-full transition-none"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-3 w-full">
          {steps.map((label, i) => {
            const isVisible = i < visibleSteps;
            const isChecked = i < checkedSteps;

            if (!isVisible) return null;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex items-center gap-3"
              >
                {isChecked ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  >
                    <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                  </motion.div>
                ) : (
                  <div className="w-[18px] h-[18px] shrink-0 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-(--sim-amber-400) animate-pulse" />
                  </div>
                )}
                <span
                  className={`text-sm ${
                    isChecked
                      ? 'text-neutral-700 dark:text-neutral-300'
                      : 'text-neutral-400'
                  }`}
                >
                  {label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
