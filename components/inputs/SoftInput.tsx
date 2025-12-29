'use client';

import { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";
import { BiEuro } from 'react-icons/bi';

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
}) => {
    return (
        <div className="w-full relative">
            {formatPrice && (
                <BiEuro
                    size={24}
                    className="text-muted-foreground absolute top-5 right-[15px]"
                />
            )}
            <input
                id={id}
                disabled={disabled}
                {...(register ? register(id, { required }) : {})}
                onChange={(e) => {
                    if (register) {
                        register(id, { required }).onChange(e);
                    }
                    if (onChange) {
                        onChange(e);
                    }
                }}
                value={value}
                placeholder=" "
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

          ${className}
        `}
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
