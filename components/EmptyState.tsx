'use client';

import { useRouter } from "next/navigation";
import Heading from "./Heading";
import { Button } from "./ui/Button";

interface EmptyStateProps {
    title?: string;
    subtitle?: string;
    showReset?: boolean;
    actionLabel?: string;
    actionUrl?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
    title = "No exact matches",
    subtitle = "Try changing or removing some of your filters",
    showReset,
    actionLabel,
    actionUrl
}) => {
    const router = useRouter();

    return (
        <div
            className="
        h-[60vh]
        flex 
        flex-col 
        gap-2 
        justify-center 
        items-center 
      "
        >
            <Heading
                center
                title={title}
                subtitle={subtitle}
            />
            <div className="mt-4 flex flex-col items-center">
                {showReset && (
                    <Button
                        variant="outline"
                        onClick={() => router.push('/')}
                    >
                        Remove all filters
                    </Button>
                )}
                {actionLabel && actionUrl && (
                    <div className="w-auto">
                        <Button
                            label={actionLabel}
                            onClick={() => router.push(actionUrl)}
                            className="w-auto rounded-full px-[20px] py-[15px]"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default EmptyState;
