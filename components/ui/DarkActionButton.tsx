'use client';

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import React from "react";
import { cn } from "@/lib/utils";

interface DarkActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: React.ElementType;
    label?: string;
    small?: boolean;
    loading?: boolean;
    variant?: 'primary' | 'outline' | 'ghost'; // Expose props compatible with Button
    size?: 'sm' | 'md' | 'lg';
}

const DarkActionButton: React.FC<DarkActionButtonProps> = ({
    className,
    style,
    ...props
}) => {
    const isDisabled = props.disabled || props.loading;

    return (
        <motion.div
            whileHover={isDisabled ? {} : { scale: 1.05 }}
            whileTap={isDisabled ? {
                boxShadow: "0px 0px 20px rgba(220, 38, 38, 0.5)",
                scale: 0.98,
                y: 1
            } : {
                scale: 0.90,
                y: 2
            }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className={cn(
                "inline-block",
                className,
                isDisabled && "cursor-not-allowed"
            )}
        >
            <Button
                className={cn(
                    "rounded-full shadow-lg text-white h-[50px] border-none", // Base styles
                    isDisabled && "pointer-events-none opacity-70"
                )}
                style={{
                    background: 'linear-gradient(#1B1D23, #35373D) padding-box, linear-gradient(to bottom, #525252, #1B1D23) border-box',
                    border: '1px solid transparent',
                    ...style // Allow overrides
                }}
                {...props}
            />
        </motion.div>
    );
};

export default DarkActionButton;
