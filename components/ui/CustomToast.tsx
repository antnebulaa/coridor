'use client';

import { toast, Toast } from 'react-hot-toast';
import { Check } from 'lucide-react';

interface CustomToastProps {
    t: Toast;
    message: string;
    onUndo?: () => void;
    undoLabel?: string;
    actionLabel?: string;
    onAction?: () => void;
}

const CustomToast: React.FC<CustomToastProps> = ({
    t,
    message,
    onUndo,
    undoLabel = "Annuler",
    actionLabel,
    onAction
}) => {
    const handleAction = () => {
        if (onUndo) {
            onUndo();
        }
        if (onAction) {
            onAction();
        }
        toast.dismiss(t.id);
    };

    const label = actionLabel || undoLabel;

    return (
        <div
            className={`${t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-auto bg-white dark:bg-neutral-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-full pointer-events-auto flex items-center ring-1 ring-black/5 dark:ring-white/10 p-2 pr-2 gap-3 transition-all duration-300`}
        >
            <div className="shrink-0 bg-green-500 rounded-full w-6 h-6 flex items-center justify-center">
                <Check size={14} className="text-white" strokeWidth={3} />
            </div>
            <div className="flex-1 pl-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {message}
                </p>
            </div>
            {(onUndo || onAction) && (
                <button
                    onClick={handleAction}
                    className="shrink-0 bg-black hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors mx-1"
                >
                    {label}
                </button>
            )}
        </div>
    );
};

export default CustomToast;
