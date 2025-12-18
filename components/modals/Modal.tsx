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
    transparentHeader?: boolean;
    noBodyPadding?: boolean;
    widthClass?: string;
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
    noBodyPadding
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
                            <div className={`
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
                                        bg-secondary 
                                        hover:bg-secondary/80 
                                        flex 
                                        items-center 
                                        justify-center 
                                        transition 
                                        absolute 
                                        left-6
                                        top-6
                                        border-0
                                        ${transparentHeader ? 'bg-white text-black shadow-md' : ''}
                                        pointer-events-auto z-50
                                    `}
                                >
                                    <X size={18} />
                                </button>
                                <div className="text-lg font-medium">{title}</div>
                            </div>
                            {/* BODY */}
                            <div className={`relative flex-auto overflow-y-auto ${noBodyPadding ? 'p-0' : 'p-6'}`}>{body}</div>
                            {/* FOOTER */}
                            <div className="flex flex-col gap-2 p-6 md:p-6 mb-12 md:mb-0">
                                <div className="flex flex-row items-center gap-4 w-full">
                                    {secondaryAction && secondaryActionLabel && (
                                        <Button
                                            variant="outline"
                                            disabled={disabled}
                                            onClick={handleSecondaryAction}
                                            className="w-full rounded-full"
                                        >
                                            {secondaryActionLabel}
                                        </Button>
                                    )}
                                    {actionLabel && (
                                        <Button
                                            disabled={disabled}
                                            onClick={handleSubmit}
                                            className="w-full rounded-full"
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
