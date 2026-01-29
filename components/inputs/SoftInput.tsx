'use client';

import { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";
import { BiEuro } from 'react-icons/bi';
import { useEffect, useRef } from "react";

interface SoftInputProps {
    id: string;
    label: string;
    type?: string;
    disabled?: boolean;
    formatPrice?: boolean;
    required?: boolean;
    register?: UseFormRegister<FieldValues>;
    errors?: FieldErrors;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    value?: string;

    inputMode?: "text" | "numeric" | "decimal" | "search" | "email" | "tel" | "url" | "none";
    className?: string;
    autoFocus?: boolean;
    inputRef?: React.Ref<HTMLInputElement>;
    placeholder?: string;
}

const SoftInput: React.FC<SoftInputProps> = ({
    id,
    label,
    type = 'text',
    disabled,
    formatPrice,
    register,
    required,
    errors,
    onChange,
    value,

    inputMode,
    className,
    autoFocus,
    inputRef,
    placeholder
}) => {
    const internalRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (autoFocus) {
            const timer = setTimeout(() => {
                internalRef.current?.focus();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [autoFocus]);

    const registerProps = register ? register(id, { required }) : {} as any;

    return (
        <div className="w-full relative min-w-0">
            {formatPrice && (
                <BiEuro
                    size={24}
                    className="text-muted-foreground absolute top-5 right-[15px]"
                />
            )}
            <input
                id={id}
                disabled={disabled}
                {...registerProps}
                ref={(e) => {
                    internalRef.current = e;

                    if (inputRef) {
                        if (typeof inputRef === 'function') {
                            inputRef(e);
                        } else {
                            (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
                        }
                    }

                    if (registerProps.ref) {
                        registerProps.ref(e);
                    }
                }}
                onChange={(e) => {
                    if (registerProps.onChange) {
                        registerProps.onChange(e);
                    }
                    if (onChange) {
                        onChange(e);
                    }
                }}
                value={value}
                placeholder={placeholder || " "}
                type={type}
                inputMode={inputMode}
                className={`
          peer
          w-full
          px-3
          pb-2
          pt-6
          font-normal
          bg-background
          border
          rounded-xl
          outline-none
          transition
          disabled:opacity-70
          disabled:cursor-not-allowed
          ${formatPrice ? 'pl-3 pr-9' : 'pl-3'}
          ${errors?.[id] ? 'border-red-500' : 'border-input'}
          ${errors?.[id] ? 'focus:border-red-500' : 'focus:border-foreground'}
          min-w-0
          [&::-webkit-calendar-picker-indicator]:hidden

          ${className}
          max-w-full
          w-full
          min-w-0
          appearance-none
        `}
                style={{
                    width: '100%',
                    maxWidth: '100%',
                }}
            />
            <label
                className={`
          absolute
          text-base
          duration-150
          transform
          -translate-y-3
          top-5
          z-10
          origin-top-left
          left-3
          scale-75
          peer-placeholder-shown:scale-100
          peer-placeholder-shown:translate-y-0
          peer-focus:scale-75
          peer-focus:-translate-y-3
          ${errors?.[id] ? 'text-red-500' : 'text-muted-foreground'}
          pointer-events-none
        `}
            >
                {label}
            </label>
        </div>
    );
};

export default SoftInput;
