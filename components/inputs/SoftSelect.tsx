'use client';

import { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";
import { BiChevronDown } from "react-icons/bi";

interface SoftSelectProps {
    id: string;
    label: string;
    options: { value: string; label: string }[];
    disabled?: boolean;
    required?: boolean;
    register?: UseFormRegister<FieldValues>;
    errors?: FieldErrors;
    onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    value?: string;
}

const SoftSelect: React.FC<SoftSelectProps> = ({
    id,
    label,
    options,
    disabled,
    register,
    required,
    errors,
    onChange,
    value,
}) => {
    return (
        <div className="w-full relative">
            <select
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
                className={`
          peer
          w-full
          px-3
          pb-2
          pt-6
          font-normal
          bg-white
          dark:bg-neutral-900
          border
          rounded-xl
          outline-none
          transition
          disabled:opacity-70
          disabled:cursor-not-allowed
          appearance-none
          text-foreground
          ${errors?.[id] ? 'border-primary' : 'border-neutral-300 dark:border-neutral-700'}
          ${errors?.[id] ? 'focus:border-primary' : 'focus:border-black dark:focus:border-neutral-400'}
        `}
            >
                {/* Empty option for placeholder behavior if needed, though select doesn't support placeholder-shown natively */}
                <option value="" disabled hidden></option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>

            <div className="absolute top-5 right-3 pointer-events-none">
                <BiChevronDown size={24} className="text-neutral-700 dark:text-neutral-300" />
            </div>

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
          ${errors?.[id] ? 'text-primary' : 'text-zinc-400 dark:text-zinc-500'}
          pointer-events-none
        `}
            >
                {label}
            </label>
        </div>
    );
};

export default SoftSelect;
