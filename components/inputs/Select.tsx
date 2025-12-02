'use client';

import { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";

interface SelectProps {
    id: string;
    label: string;
    options: { value: string; label: string }[];
    disabled?: boolean;
    required?: boolean;
    register: UseFormRegister<FieldValues>;
    errors: FieldErrors;
}

const Select: React.FC<SelectProps> = ({
    id,
    label,
    options,
    disabled,
    register,
    required,
    errors,
}) => {
    return (
        <div className="w-full relative">
            <select
                id={id}
                disabled={disabled}
                {...register(id, { required })}
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
          ${errors[id] ? 'border-rose-500' : 'border-neutral-300'}
          ${errors[id] ? 'focus:border-rose-500' : 'focus:border-black'}
        `}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
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
          left-3
          peer-placeholder-shown:scale-100
          peer-placeholder-shown:translate-y-0
          peer-focus:scale-75
          peer-focus:-translate-y-4
          ${errors[id] ? 'text-rose-500' : 'text-zinc-400'}
          pointer-events-none
        `}
            >
                {label}
            </label>
        </div>
    );
};

export default Select;
