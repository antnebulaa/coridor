'use client';

import { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";

interface SoftTextAreaProps {
    id: string;
    label: string;
    disabled?: boolean;
    required?: boolean;
    register: UseFormRegister<FieldValues>;
    errors: FieldErrors;
    maxLength?: number;
    value?: string; // For controlled input if needed
    watchValue?: string; // To display char count
}

const SoftTextArea: React.FC<SoftTextAreaProps> = ({
    id,
    label,
    disabled,
    register,
    required,
    errors,
    maxLength,
    watchValue
}) => {
    return (
        <div className="w-full relative">
            <textarea
                id={id}
                disabled={disabled}
                {...register(id, { required, maxLength })}
                placeholder=" "
                className={`
                    peer
                    w-full
                    p-4
                    pt-6
                    font-light
                    bg-white
                    border-2
                    rounded-md
                    outline-none
                    transition
                    disabled:opacity-70
                    disabled:cursor-not-allowed
                    ${errors[id] ? 'border-rose-500' : 'border-neutral-200'}
                    ${errors[id] ? 'focus:border-rose-500' : 'focus:border-black'}
                    min-h-[150px]
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
                    origin-[0]
                    left-4
                    peer-placeholder-shown:scale-100
                    peer-placeholder-shown:translate-y-0
                    peer-focus:scale-75
                    peer-focus:-translate-y-4
                    ${errors[id] ? 'text-rose-500' : 'text-zinc-400'}
                `}
            >
                {label}
            </label>
            {maxLength && watchValue && (
                <div className="absolute bottom-2 right-2 text-xs text-neutral-400">
                    {watchValue.length}/{maxLength}
                </div>
            )}
        </div>
    );
};

export default SoftTextArea;
