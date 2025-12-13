'use client';

import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';

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
    className
}) => {
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        setShowModal(!!isOpen);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
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

    return (
        <>
            <div
                onClick={handleClose}
                className={`
                    justify-center 
                    items-center 
                    flex 
                    overflow-x-hidden 
                    overflow-hidden 
                    md:overflow-y-auto 
                    fixed
                    inset-0 
                    z-[10000] 
                    outline-none 
                    focus:outline-none
                    transition
                    duration-300
                    ${showModal ? 'bg-neutral-800/50' : 'bg-neutral-800/0'}
                    ${className}
                `}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full md:w-4/6 lg:w-3/6 xl:w-2/5 md:my-6 mx-auto h-full lg:h-auto md:h-auto"
                >
                    {/* CONTENT */}
                    <div
                        className={`
            translate
            duration-300
            h-full
            ${showModal ? 'translate-y-0' : 'translate-y-full'}
            ${showModal ? 'opacity-100' : 'opacity-0'}
          `}
                    >
                        <div className="h-full lg:h-auto md:h-auto border-0 md:rounded-[25px] rounded-none shadow-[0_0_30px_rgba(0,0,0,0.3)] relative flex flex-col w-full bg-background outline-none focus:outline-none">
                            {/* HEADER */}
                            <div className="flex items-center p-6 rounded-t justify-center relative border-b border-border">
                                <button
                                    onClick={handleClose}
                                    className="
                                        w-10 
                                        h-10 
                                        rounded-full 
                                        bg-secondary 
                                        hover:bg-secondary/80 
                                        flex 
                                        items-center 
                                        justify-center 
                                        transition 
                                        absolute 
                                        left-6
                                        border-0
                                    "
                                >
                                    <X size={18} />
                                </button>
                                <div className="text-lg font-medium">{title}</div>
                            </div>
                            {/* BODY */}
                            <div className="relative p-6 flex-auto overflow-y-auto">{body}</div>
                            {/* FOOTER */}
                            <div className="flex flex-col gap-2 p-3 md:p-6">
                                <div className="flex flex-row items-center gap-4 w-full">
                                    {secondaryAction && secondaryActionLabel && (
                                        <Button
                                            variant="outline"
                                            disabled={disabled}
                                            onClick={handleSecondaryAction}
                                            className="w-full"
                                        >
                                            {secondaryActionLabel}
                                        </Button>
                                    )}
                                    {actionLabel && (
                                        <Button
                                            disabled={disabled}
                                            onClick={handleSubmit}
                                            className="w-full"
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
};

export default Modal;
