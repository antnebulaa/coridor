'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { createPortal } from 'react-dom';

interface ModalProps {
    isOpen?: boolean;
    onClose: () => void;
    onSubmit: () => void;
    title?: string;
    body?: React.ReactElement;
    footer?: React.ReactElement;
    actionLabel: string;
    disabled?: boolean;
    secondaryAction?: () => void;
    secondaryActionLabel?: string;
    className?: string;
    transparentHeader?: boolean;
    noBodyPadding?: boolean;
    widthClass?: string;
    hideHeader?: boolean;
    skipTranslateAnimation?: boolean;
    currentStep?: number;
    totalSteps?: number;
    closeButtonPosition?: 'left' | 'right';
    closeButtonVariant?: 'default' | 'transparent-white';
}

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    title,
    body,
    footer,
    actionLabel,
    disabled,
    secondaryAction,
    secondaryActionLabel,
    className,
    widthClass,
    transparentHeader,
    noBodyPadding,
    hideHeader,
    skipTranslateAnimation,
    currentStep,
    totalSteps,
    closeButtonPosition = 'right',
    closeButtonVariant = 'default'
}) => {
    const [showModal, setShowModal] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Pull-to-close state
    const [isDragging, setIsDragging] = useState(false);
    const [translateY, setTranslateY] = useState(0);
    const startY = useRef<number>(0);
    const contentRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null); // To check scrollTop

    useEffect(() => {
        setShowModal(!!isOpen);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            // Reset drag state on open
            setTranslateY(0);
            setIsDragging(false);
        } else {
            document.body.style.overflow = 'unset';
            // Reset drag state on close
            setTimeout(() => {
                setTranslateY(0);
                setIsDragging(false);
            }, 300);
        }

        return () => {
            document.body.style.overflow = 'unset';
        }
    }, [isOpen]);

    const handleClose = useCallback(() => {
        if (disabled) {
            return;
        }

        setShowModal(false);
        setTimeout(() => {
            onClose();
        }, 300);
    }, [disabled, onClose]);

    // Touch Handlers
    const onTouchStart = (e: React.TouchEvent) => {
        // Only allow if we are at the top of the scroll content
        if (scrollRef.current && scrollRef.current.scrollTop > 0) return;

        startY.current = e.touches[0].clientY;
        setIsDragging(true);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;

        // Check scroll again just in case
        if (scrollRef.current && scrollRef.current.scrollTop > 0) {
            setTranslateY(0);
            return;
        }

        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;

        // Only allow dragging down (positive diff)
        if (diff > 0) {
            // Add resistance/damping
            setTranslateY(diff * 0.6);
            // Optional: Prevent default to stop native scroll bouncing? 
            // e.preventDefault() might break scroll if not careful, better to let it be for now since we check scrollTop
        }
    };

    const onTouchEnd = () => {
        setIsDragging(false);
        if (translateY > 150) { // Threshold to close
            handleClose();
        } else {
            setTranslateY(0); // Snap back
        }
    };

    const handleSubmit = useCallback(() => {
        if (disabled) {
            return;
        }

        onSubmit();
    }, [disabled, onSubmit]);

    const handleSecondaryAction = useCallback(() => {
        if (disabled || !secondaryAction) {
            return;
        }

        secondaryAction();
    }, [disabled, secondaryAction]);

    if (!isOpen) {
        return null;
    }

    // Ensure mounted on client
    if (!mounted) return null;

    // Opacity calculation for "FERMER"
    const fermerOpacity = Math.min(translateY / 150, 1);

    const modalContent = (
        <>
            <div
                onClick={handleClose}
                className={`
                    justify-center 
                    items-end
                    md:items-center 
                    flex 
                    overflow-x-hidden 
                    overflow-hidden 
                    md:overflow-y-auto 
                    fixed
                    inset-0 
                    z-[9999] 
                    outline-none 
                    focus:outline-none
                    transition
                    duration-300
                    ${showModal ? 'bg-neutral-800/50' : 'bg-neutral-800/0'}
                    ${className}
                `}
            >
                {/* FERMER Indicator (Mobile Only) */}
                <div
                    className="
                        md:hidden 
                        fixed 
                        inset-0 
                        flex 
                        items-start 
                        justify-center 
                        pt-10
                        pointer-events-none 
                        z-0
                    "
                    style={{ opacity: fermerOpacity }}
                >
                    <span className="bg-white/90 dark:bg-neutral-800/90 text-black dark:text-white px-6 py-2 rounded-full font-bold text-sm tracking-widest shadow-lg border border-black/5">
                        FERMER
                    </span>
                </div>

                <div
                    onClick={(e) => e.stopPropagation()}
                    className={`
                        relative 
                        mx-auto 
                        h-full 
                        md:h-auto 
                        lg:h-auto 
                        md:my-6
                        ${className ? '' : ''} 
                        ${widthClass ? widthClass : 'w-full md:w-4/6 lg:w-3/6 xl:w-2/5'}
                    `}
                >
                    {/* CONTENT */}
                    <div
                        style={isDragging || translateY !== 0 ? { transform: `translateY(${translateY}px)` } : undefined}
                        className={`
                            transform
                            transition
                            duration-300
                            ease-out
                            h-full
                            md:h-auto
                            ${!skipTranslateAnimation ? (showModal ? 'translate-y-0' : 'translate-y-full') : ''}
                            ${showModal ? 'opacity-100' : 'opacity-0'}
                            ${isDragging ? 'transition-none' : ''} 
                        `}
                    >
                        <div className="h-full lg:h-auto md:h-auto border-0 md:rounded-[25px] rounded-none shadow-[0_0_30px_rgba(0,0,0,0.3)] relative flex flex-col w-full bg-white dark:bg-neutral-900 outline-none focus:outline-none md:max-h-[85vh]">
                            {/* HEADER */}
                            {!hideHeader && (
                                <div
                                    // Attach Touch Handlers to Header area specifically? 
                                    // Or mainly the body? The user wants "draggant vers le bas", usually from top or list top.
                                    // Attaching to the main container wrapper inside content might be best.
                                    // Let's attach to this Header div for ease of pulling from top.
                                    onTouchStart={onTouchStart}
                                    onTouchMove={onTouchMove}
                                    onTouchEnd={onTouchEnd}
                                    className={`
                                flex items-center justify-center 
                                ${title ? 'border-b border-border' : ''}
                                ${transparentHeader
                                            ? 'absolute top-0 left-0 right-0 z-50 bg-transparent border-none pointer-events-none p-6'
                                            : 'relative p-6 rounded-t'
                                        }
                            `}>
                                    <button
                                        onClick={handleClose}
                                        className={`
                                        w-10 
                                        h-10 
                                        rounded-full 
                                        flex 
                                        items-center 
                                        justify-center 
                                        transition 
                                        absolute 
                                        top-6
                                        top-6
                                        ${closeButtonPosition === 'left' ? 'left-6' : 'right-6'}
                                        ${closeButtonVariant === 'transparent-white'
                                                ? 'bg-transparent border border-white text-white hover:bg-white/20 shadow-none'
                                                : `bg-secondary hover:bg-secondary/80 border-0 ${transparentHeader ? 'bg-white text-black shadow-md' : ''}`
                                            }
                                        pointer-events-auto z-50
                                        pointer-events-auto z-50
                                    `}
                                    >
                                        <X size={18} />
                                    </button>
                                    <div className="text-lg font-medium">{title}</div>
                                </div>
                            )}

                            {/* BODY with Scroll Ref */}
                            <div
                                ref={scrollRef}
                                onTouchStart={onTouchStart}
                                onTouchMove={onTouchMove}
                                onTouchEnd={onTouchEnd}
                                className={`relative flex-auto overflow-y-auto ${noBodyPadding ? 'p-0' : 'p-6'}`}
                            >
                                {body}
                            </div>

                            {/* FOOTER */}
                            <div className="flex flex-col gap-2 p-6 md:p-6 mb-12 md:mb-0">
                                {/* Progress Bar (Moved above buttons) */}
                                {currentStep && totalSteps && (
                                    <div className="hidden md:flex w-full justify-center mb-2">
                                        <div className="h-[6px] w-[120px] shrink-0 bg-neutral-100 rounded-full overflow-hidden relative">
                                            <div
                                                className="absolute top-0 left-0 h-full bg-neutral-800 transition-all duration-300"
                                                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="flex flex-col md:flex-row items-center gap-4 w-full justify-between">
                                    {secondaryAction && secondaryActionLabel && (
                                        <Button
                                            variant="outline"
                                            disabled={disabled}
                                            onClick={handleSecondaryAction}
                                            className="w-full md:w-auto md:flex-1 rounded-full h-[50px] text-[16px] !border-neutral-200 !border-[1px] hover:!border-black"
                                        >
                                            {secondaryActionLabel}
                                        </Button>
                                    )}

                                    {/* Progress Bar (Only if steps provided) */}


                                    {actionLabel && (
                                        <Button
                                            disabled={disabled}
                                            onClick={handleSubmit}
                                            className="w-full md:w-auto md:flex-1 rounded-full h-[50px] text-[16px]"
                                        >
                                            {actionLabel}
                                        </Button>
                                    )}
                                </div>
                                {footer}
                            </div>
                        </div>
                    </div>
                </div>
            </div >
        </>
    );

    return createPortal(modalContent, document.body);
};

export default Modal;
