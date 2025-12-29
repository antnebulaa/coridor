'use client';

import { Button } from './ui/Button';
import { cn } from "@/lib/utils";

interface PageHeaderProps {
    title: React.ReactNode;
    subtitle?: string;
    actionLabel?: string;
    onAction?: () => void;
    secondaryActionLabel?: string;
    secondaryAction?: () => void;
    actionControls?: React.ReactNode;
    titleClassName?: string;
    hideSeparator?: boolean;
}

const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    actionLabel,
    onAction,
    secondaryActionLabel,
    secondaryAction,
    actionControls,
    titleClassName,
    hideSeparator
}) => {
    return (
        <div className="flex flex-col gap-4 pt-4">
            <div className="flex flex-row items-center justify-between gap-4">
                <div className="text-start">
                    <div className={cn("text-2xl font-medium", titleClassName)}>
                        {title}
                    </div>
                    {subtitle && (
                        <div className="font-light text-neutral-500 mt-2">
                            {subtitle}
                        </div>
                    )}
                </div>
                {(actionControls || (secondaryAction && secondaryActionLabel) || (onAction && actionLabel)) && (
                    <div className="flex flex-row items-center justify-end gap-2 w-full md:w-auto">
                        {actionControls}
                        {secondaryAction && secondaryActionLabel && (
                            <Button
                                variant="outline"
                                onClick={secondaryAction}
                                label={secondaryActionLabel}
                                className="w-auto rounded-full px-4 border-neutral-300 hover:bg-neutral-50"
                            />
                        )}
                        {onAction && actionLabel && (
                            <Button
                                onClick={onAction}
                                label={actionLabel}
                                className="w-auto rounded-full px-4"
                            />
                        )}
                    </div>
                )}
            </div>
            {!hideSeparator && <hr />}
        </div>
    );
};

export default PageHeader;
