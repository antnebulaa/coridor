'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface PhoneInputProps {
    value?: string;
    onChange: (e164Value: string) => void;
    disabled?: boolean;
    error?: string;
}

/**
 * French mobile phone input with +33 prefix, flag, and validation.
 * Accepts: 6XXXXXXXX, 06XXXXXXXX, 7XXXXXXXX, 07XXXXXXXX
 * Outputs: E.164 format (+33XXXXXXXXX) via onChange
 */
const PhoneInput: React.FC<PhoneInputProps> = ({ value, onChange, disabled, error: externalError }) => {
    // Extract the 9-digit part from an E.164 value (e.g. +33612345678 → 612345678)
    const extractLocal = (val?: string): string => {
        if (!val) return '';
        const clean = val.replace(/[\s.\-()]/g, '');
        if (clean.startsWith('+33')) return clean.slice(3);
        if (clean.startsWith('33') && clean.length > 10) return clean.slice(2);
        if (clean.startsWith('0') && clean.length === 10) return clean.slice(1);
        return clean;
    };

    const [localNumber, setLocalNumber] = useState(() => extractLocal(value));
    const [touched, setTouched] = useState(false);

    // Sync from parent if value changes externally
    useEffect(() => {
        const extracted = extractLocal(value);
        if (extracted !== localNumber) {
            setLocalNumber(extracted);
        }
    }, [value]);

    const formatDisplay = (raw: string): string => {
        // Format as: 6 12 34 56 78
        const digits = raw.replace(/\D/g, '').slice(0, 9);
        const parts = [];
        if (digits.length > 0) parts.push(digits.slice(0, 1));
        if (digits.length > 1) parts.push(digits.slice(1, 3));
        if (digits.length > 3) parts.push(digits.slice(3, 5));
        if (digits.length > 5) parts.push(digits.slice(5, 7));
        if (digits.length > 7) parts.push(digits.slice(7, 9));
        return parts.join(' ');
    };

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        let raw = e.target.value.replace(/\D/g, '');

        // Auto-strip leading 0 (user typed 06... or 07...)
        if (raw.startsWith('0')) {
            raw = raw.slice(1);
        }

        // Cap at 9 digits
        raw = raw.slice(0, 9);
        setLocalNumber(raw);

        // Emit E.164 value
        if (raw.length === 9 && (raw.startsWith('6') || raw.startsWith('7'))) {
            onChange('+33' + raw);
        } else {
            // Emit partial so parent knows it changed (but it won't be valid)
            onChange(raw ? '+33' + raw : '');
        }
    }, [onChange]);

    // Validation
    const digits = localNumber.replace(/\D/g, '');
    let validationError = '';
    if (touched && digits.length > 0) {
        if (!digits.startsWith('6') && !digits.startsWith('7')) {
            validationError = 'Seuls les mobiles (06 / 07) sont acceptés';
        } else if (digits.length < 9) {
            validationError = `${9 - digits.length} chiffre${9 - digits.length > 1 ? 's' : ''} manquant${9 - digits.length > 1 ? 's' : ''}`;
        }
    }

    const isValid = digits.length === 9 && (digits.startsWith('6') || digits.startsWith('7'));
    const showError = (touched && validationError) || externalError;

    return (
        <div>
            <label className="text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1.5 block">
                Téléphone mobile
            </label>
            <div
                className={`flex items-center rounded-xl border transition ${
                    showError
                        ? 'border-red-400 focus-within:border-red-500'
                        : isValid
                            ? 'border-green-400 focus-within:border-green-500'
                            : 'border-neutral-200 dark:border-neutral-700 focus-within:border-neutral-400'
                } bg-white dark:bg-neutral-900 overflow-hidden`}
            >
                {/* Flag + prefix */}
                <div className="flex items-center gap-1.5 pl-3.5 pr-2 py-3 text-sm font-medium text-neutral-500 dark:text-neutral-400 select-none shrink-0 border-r border-neutral-100 dark:border-neutral-800">
                    <span className="text-base leading-none">🇫🇷</span>
                    <span>+33</span>
                </div>

                {/* Input */}
                <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={formatDisplay(localNumber)}
                    onChange={handleChange}
                    onBlur={() => setTouched(true)}
                    disabled={disabled}
                    placeholder="6 12 34 56 78"
                    className="flex-1 px-3 py-3 text-sm bg-transparent outline-none text-neutral-900 dark:text-white placeholder:text-neutral-300 dark:placeholder:text-neutral-600 disabled:opacity-50 tracking-wide"
                />

                {/* Status indicator */}
                {isValid && (
                    <div className="pr-3 text-green-500">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                )}
            </div>

            {/* Error / hint */}
            {showError && (
                <p className="text-xs text-red-500 mt-1.5">
                    {validationError || externalError}
                </p>
            )}
        </div>
    );
};

export default PhoneInput;
