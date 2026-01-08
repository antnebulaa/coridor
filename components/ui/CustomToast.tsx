'use client';

import { toast, Toast } from 'react-hot-toast';
import { Check, X } from 'lucide-react';
import { useEffect } from 'react';

interface CustomToastProps {
    t: Toast;
    message: string;
    type?: 'success' | 'error';
    onUndo?: () => void;
    undoLabel?: string;
    actionLabel?: string;
    onAction?: () => void;
}

const CustomToast: React.FC<CustomToastProps> = ({
    t,
    message,
    type = 'success',
    onUndo,
    undoLabel = "Annuler",
    actionLabel,
    onAction
}) => {
    // -------------------------------------------------------------------------
    // Mobile Fix: Force dismiss on touch devices where "hover" can stick.
    // React-hot-toast pauses on hover by default, which is problematic on mobile
    // if the tap triggers a persistent hover state.
    // -------------------------------------------------------------------------
    useEffect(() => {
        const isTouch = window.matchMedia('(hover: none)').matches;
        if (isTouch) {
            const timer = setTimeout(() => {
                toast.dismiss(t.id);
            }, 4000); // Match global duration

            return () => clearTimeout(timer);
        }
    }, [t.id]);

    const handleAction = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
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
            onClick={() => toast.dismiss(t.id)}
            className={`${t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-auto bg-white dark:bg-neutral-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-full pointer-events-auto flex items-center ring-1 ring-black/5 dark:ring-white/10 py-2 pl-3 pr-2 gap-3 transition-all duration-300 cursor-pointer`}
        >
            <div className={`shrink-0 rounded-full w-6 h-6 flex items-center justify-center ${type === 'error' ? 'bg-rose-500' : 'bg-green-500'
                }`}>
                {type === 'error' ? (
                    <X size={14} className="text-white" strokeWidth={3} />
                ) : (
                    <Check size={14} className="text-white" strokeWidth={3} />
                )}
            </div>
            <div className="flex-1 pl-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {message}
                </p>
            </div>
            {(onUndo || onAction) && (
                <button
                    onClick={handleAction}
                    className="shrink-0 bg-black hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-white text-xs font-medium px-4 py-2 rounded-full transition-colors mx-1"
                >
                    {label}
                </button>
            )}
        </div>
    );
};

export default CustomToast;
