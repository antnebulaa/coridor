'use client';

import { useCallback } from "react";
import { AiOutlineMinus, AiOutlinePlus } from "react-icons/ai";

interface CounterProps {
    title: string;
    subtitle: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
}

const Counter: React.FC<CounterProps> = ({
    title,
    subtitle,
    value,
    onChange,
    min = 1
}) => {
    const onAdd = useCallback(() => {
        onChange(value + 1);
    }, [onChange, value]);

    const onReduce = useCallback(() => {
        if (value === min) {
            return;
        }

        onChange(value - 1);
    }, [onChange, value, min]);

    return (
        <div className="flex flex-row items-center gap-8">
            <div className="flex flex-col">
                <div className="font-medium">{title}</div>
                <div className="font-light text-gray-600">{subtitle}</div>
            </div>
            <div className="flex flex-row items-center gap-1.5 ml-auto">
                <div
                    onClick={onReduce}
                    className={`
                        w-10
                        h-10
                        rounded-full
                        border-[1px]
                        border-neutral-400
                        flex
                        items-center
                        justify-center
                        text-neutral-600
                        cursor-pointer
                        hover:opacity-80
                        active:border-black
                        active:text-black
                        transition
                        bg-neutral-50
                        dark:bg-neutral-800
                        ${value === min ? 'opacity-20 cursor-not-allowed' : ''}
                    `}
                >
                    <AiOutlineMinus />
                </div>
                <div className="font-normal text-xl text-neutral-900 dark:text-neutral-100 w-8 text-center">
                    {value}
                </div>
                <div
                    onClick={onAdd}
                    className="
                        w-10
                        h-10
                        rounded-full
                        border-[1px]
                        border-neutral-400
                        flex
                        items-center
                        justify-center
                        text-neutral-600
                        cursor-pointer
                        hover:opacity-80
                        active:border-black
                        active:text-black
                        transition
                        bg-neutral-50
                        dark:bg-neutral-800
                    "
                >
                    <AiOutlinePlus />
                </div>
            </div>
        </div>
    );
}

export default Counter;
