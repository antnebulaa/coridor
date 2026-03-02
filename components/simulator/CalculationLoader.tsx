'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

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

function CoridorEye({ size = 80 }: { size?: number }) {
  // Proportions based on the logo: outer squircle, inner pill, round pupil
  const w = size;
  const h = size * 0.72;
  const cx = w / 2;
  const cy = h / 2;

  // Inner white pill
  const pillW = w * 0.52;
  const pillH = h * 0.38;
  const pillR = pillH / 2;
  const pillX = cx - pillW / 2;
  const pillY = cy - pillH / 2;

  // Pupil
  const pupilR = pillH * 0.52;
  const travel = pillW * 0.22; // how far the pupil moves

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      {/* Outer eye shape — squircle */}
      <rect
        x={w * 0.04}
        y={h * 0.06}
        width={w * 0.92}
        height={h * 0.88}
        rx={h * 0.38}
        fill="#B9592D"
      />
      {/* Inner white area — horizontal pill */}
      <rect
        x={pillX}
        y={pillY}
        width={pillW}
        height={pillH}
        rx={pillR}
        fill="white"
      />
      {/* Animated pupil */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={pupilR}
        fill="#1A1A1A"
        animate={{
          cx: [cx, cx + travel, cx + travel, cx - travel, cx - travel, cx],
        }}
        transition={{
          duration: 1.6,
          ease: 'easeInOut',
          repeat: Infinity,
          times: [0, 0.2, 0.35, 0.55, 0.7, 0.9],
        }}
      />
    </svg>
  );
}

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[10001] flex flex-col items-center justify-center bg-[#FAF9F6] dark:bg-[#0F0F0F]"
    >
      {/* Animated eye logo */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <CoridorEye size={90} />
      </motion.div>

      {/* Title */}
      <h3
        className="text-xl md:text-2xl font-medium text-neutral-900 dark:text-white mb-8 text-center px-4"
      >
        Analyse de votre investissement...
      </h3>

      {/* Progress bar */}
      <div className="w-full max-w-xs h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden mb-8 mx-4">
        <div
          className="h-full bg-linear-to-r from-[#D4703D] to-[#B9592D] rounded-full transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-3 px-4">
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
                  <div className="w-2 h-2 rounded-full bg-[#B9592D] animate-pulse" />
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
  );
}
