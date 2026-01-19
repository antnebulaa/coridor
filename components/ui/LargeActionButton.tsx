'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface LargeActionButtonProps extends React.ComponentProps<typeof Button> {
    label: string;
}

const LargeActionButton: React.FC<LargeActionButtonProps> = ({
    label,
    className,
    ...props
}) => {
    return (
        <Button
            label={label}
            className={cn(
                "w-full py-[12px] rounded-[20px] text-[15px] h-auto font-medium",
                className
            )}
            {...props}
        />
    );
};

export default LargeActionButton;
