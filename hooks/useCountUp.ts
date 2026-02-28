'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Animates a number from 0 to target over `duration` ms with ease-out cubic.
 * Returns the current animated value (integer).
 *
 * @param target - The final value to animate to
 * @param duration - Animation duration in ms (default 800)
 * @param enabled - Whether to animate (false = snap to target immediately)
 */
export function useCountUp(target: number, duration = 800, enabled = true): number {
  const [value, setValue] = useState(enabled ? 0 : target);
  const prevTarget = useRef(target);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }

    // Only animate on first mount or when target actually changes
    const from = hasAnimated.current ? prevTarget.current : 0;
    prevTarget.current = target;
    hasAnimated.current = true;

    if (from === target) {
      setValue(target);
      return;
    }

    const start = performance.now();
    let raf: number;

    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // Ease-out cubic: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, enabled]);

  return value;
}
