'use client';

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import React from "react";
import { cn } from "@/lib/utils";

interface DarkActionButtonFlexProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: React.ElementType;
    label?: string;
    small?: boolean;
    loading?: boolean;
    variant?: 'primary' | 'outline' | 'ghost'; // Expose props compatible with Button
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean; // Keep optional fullWidth or just make it default behavior? 
    // The user said "En gros il sera flexible." and "takes full width".
    // I'll make the component ITSELF be full width by default via "w-full" class.
    // But since it might be used where we want to control width via className, I'll allow overrides.
    // Default: block w-full.
}

const DarkActionButtonFlex: React.FC<DarkActionButtonFlexProps> = ({
    className,
    style,
    fullWidth = true, // Default to true effectively for this component
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
                "block w-full",
                className,
                isDisabled && "cursor-not-allowed"
            )}
        >
            <Button
                className={cn(
                    "rounded-full shadow-lg text-white h-full border-none w-full",
                    isDisabled && "pointer-events-none opacity-70" // Ensure wrapper catches click and styling matches
                )}
                style={{
                    background: 'linear-gradient(#1B1D23, #35373D) padding-box, linear-gradient(to bottom, #525252, #1B1D23) border-box',
                    border: '1px solid transparent',
                    ...style
                }}
                {...props}
            />
        </motion.div>
    );
};

export default DarkActionButtonFlex;
