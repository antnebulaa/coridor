'use client';

import React, { forwardRef, InputHTMLAttributes } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedNumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value'> {
    value: string | number;
    // We pass any extra element to render beside the number (like " m²")
    suffix?: React.ReactNode;
}

const AnimatedNumberInput = forwardRef<HTMLInputElement, AnimatedNumberInputProps>(
    ({ value, className, suffix, onChange, onBlur, onFocus, ...props }, ref) => {
        const stringValue = String(value || '');
        const chars = stringValue.split('');

        return (
            <div className={`relative flex items-center justify-center ${className || ''}`}>
                {/* The invisible native input for mobile accessibility and hook-form */}
                <input
                    ref={ref}
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    onFocus={onFocus}
                    style={{ caretColor: 'transparent' }}
                    className="absolute inset-0 w-full h-full opacity-0 text-transparent z-10 cursor-text"
                    {...props}
                />

                {/* The visual animated layer */}
                <div
                    className="flex text-center pointer-events-none items-center justify-center relative min-h-[1.2em]"
                    aria-hidden="true"
                >
                    {chars.length === 0 ? (
                        <span className="text-neutral-200">0</span>
                    ) : (
                        <AnimatePresence mode="popLayout" initial={false}>
                            {chars.map((char, i) => (
                                <motion.span
                                    // Use index + char combination to ensure uniqueness and proper entry/exit
                                    // Normally just char + unique id is better for reordering, 
                                    // but for typing appended numbers, index works best.
                                    key={`${i}-${char}`}
                                    initial={{ y: 20, opacity: 0, scale: 0.8 }}
                                    animate={{ y: 0, opacity: 1, scale: 1 }}
                                    exit={{ y: -20, opacity: 0, scale: 0.8 }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 400,
                                        damping: 30,
                                        mass: 0.8,
                                    }}
                                    className="inline-block origin-bottom"
                                >
                                    {char}
                                </motion.span>
                            ))}
                        </AnimatePresence>
                    )}
                    {suffix && (
                        <span className="inline-block ml-2 text-3xl md:text-4xl font-bold text-neutral-400">
                            {suffix}
                        </span>
                    )}
                </div>
            </div>
        );
    }
);

AnimatedNumberInput.displayName = 'AnimatedNumberInput';

export default AnimatedNumberInput;
