'use client';

import { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";
import { BiEuro } from 'react-icons/bi';

interface InputProps {
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
}

const Input: React.FC<InputProps> = ({
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
}) => {
    return (
        <div className="w-full relative">
            {formatPrice && (
                <BiEuro
                    size={24}
                    className="text-neutral-700 absolute top-5 left-2"
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
          p-3
          pt-5
          font-light
          bg-white
          border-[1px]
          rounded-xl
          outline-none
          transition
          disabled:opacity-70
          disabled:cursor-not-allowed
          ${formatPrice ? 'pl-9' : 'pl-3'}
          ${errors?.[id] ? 'border-rose-500' : 'border-neutral-300'}
          ${errors?.[id] ? 'focus:border-rose-500' : 'focus:border-black'}
        `}
            />
            <label
                className={`
          absolute
          text-sm
          duration-150
          transform
          -translate-y-3
          top-4
          z-10
          origin-[0]
          ${formatPrice ? 'left-9' : 'left-3'}
          peer-placeholder-shown:scale-100
          peer-placeholder-shown:translate-y-0
          peer-focus:scale-75
          peer-focus:-translate-y-4
          ${errors?.[id] ? 'text-rose-500' : 'text-zinc-400'}
        `}
            >
                {label}
            </label>
        </div>
    );
};

export default Input;
