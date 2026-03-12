'use client';

import { useRef, useEffect } from 'react';
import { Button } from './ui/Button';
import { cn } from "@/lib/utils";
import { useRouter } from "@/i18n/navigation";
import { BiChevronLeft } from "react-icons/bi";
import { useAccountHeader } from "@/hooks/useAccountHeader";

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
    showBack?: boolean;
    backLabel?: string;
    backHref?: string;
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
    hideSeparator,
    showBack,
    backLabel,
    backHref
}) => {
    const router = useRouter();
    const titleRef = useRef<HTMLDivElement>(null);
    const { setTitleVisibility, scrollRef } = useAccountHeader();

    useEffect(() => {
        const el = titleRef.current;
        const container = scrollRef.current;
        if (!el || !container) return;

        // Distance from scroll container top to the bottom of the title at scrollTop=0
        const threshold = el.offsetTop - container.offsetTop + el.offsetHeight;

        const check = () => {
            // Binary: title hidden (0) or visible (1) — CSS transition handles the animation
            setTitleVisibility(container.scrollTop >= threshold ? 0 : 1);
        };

        check();
        container.addEventListener('scroll', check, { passive: true });
        return () => container.removeEventListener('scroll', check);
    }, [setTitleVisibility, scrollRef]);

    return (
        <div className="flex flex-col gap-4 pt-0 md:pt-4">
            {showBack && (
                <div
                    onClick={() => backHref ? router.push(backHref) : router.back()}
                    className="
                        flex items-center gap-1 cursor-pointer hover:opacity-75 transition w-fit text-neutral-600
                    "
                >
                    <BiChevronLeft size={24} />
                    <div className="font-medium text-sm">
                        {backLabel || 'Retour'}
                    </div>
                </div>
            )}
            <div className="flex flex-row items-center justify-between gap-4">
                <div className="text-start">
                    <div ref={titleRef} className={cn("text-4xl font-medium tracking-tight", titleClassName)}>
                        {title}
                    </div>
                    {subtitle && (
                        <div className="font-normal text-base text-neutral-500 mt-1">
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
            
        </div>
    );
};

export default PageHeader;
