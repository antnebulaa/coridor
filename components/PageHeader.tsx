'use client';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onAction?: () => void;
    secondaryActionLabel?: string;
    secondaryAction?: () => void;
    actionControls?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    actionLabel,
    onAction,
    secondaryActionLabel,
    secondaryAction,
    actionControls
}) => {
    return (
        <div className="flex flex-col gap-6 pt-4 md:pt-0">
            <div className="flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-6">
                <div className="text-start">
                    <div className="text-2xl font-bold">
                        {title}
                    </div>
                    {subtitle && (
                        <div className="font-light text-neutral-500 mt-2">
                            {subtitle}
                        </div>
                    )}
                </div>
                <div className="flex flex-row items-center justify-end gap-2 w-full md:w-auto">
                    {actionControls}
                    {secondaryAction && secondaryActionLabel && (
                        <button
                            onClick={secondaryAction}
                            className="
                                px-4
                                py-3
                                md:py-2
                                rounded-full
                                border-[1px]
                                border-neutral-300
                                hover:shadow-md
                                hover:bg-neutral-50
                                transition
                                cursor-pointer
                                text-sm
                                font-semibold
                            "
                        >
                            {secondaryActionLabel}
                        </button>
                    )}
                    {onAction && actionLabel && (
                        <button
                            onClick={onAction}
                            className="
                                px-4
                                py-3
                                md:py-2
                                rounded-full
                                bg-primary
                                text-white
                                hover:bg-primary-hover
                                transition
                                cursor-pointer
                                text-sm
                                font-semibold
                            "
                        >
                            {actionLabel}
                        </button>
                    )}
                </div>
            </div>
            <hr />
        </div>
    );
};

export default PageHeader;
