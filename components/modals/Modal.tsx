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
                    overflow-y-auto 
                    fixed 
                    inset-0 
                    z-[60] 
                    outline-none 
                    focus:outline-none
                    transition
                    duration-300
                    ${showModal ? 'bg-neutral-800/50' : 'bg-neutral-800/0'}
                `}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full md:w-4/6 lg:w-3/6 xl:w-2/5 my-6 mx-auto h-full lg:h-auto md:h-auto"
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
                        <div className="translate h-full lg:h-auto md:h-auto border-0 md:rounded-[25px] rounded-none shadow-[0_0_30px_rgba(0,0,0,0.3)] relative flex flex-col w-full bg-white outline-none focus:outline-none">
                            {/* HEADER */}
                            <div className="flex items-center p-6 rounded-t justify-center relative border-b-[1px] border-[#dfdfdf]">
                                <button
                                    onClick={handleClose}
                                    className="p-1 border-0 hover:opacity-70 transition absolute left-9"
                                >
                                    <X size={18} />
                                </button>
                                <div className="text-lg font-medium">{title}</div>
                            </div>
                            {/* BODY */}
                            <div className="relative p-6 flex-auto">{body}</div>
                            {/* FOOTER */}
                            <div className="flex flex-col gap-2 p-6">
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
            </div>
        </>
    );
};

export default Modal;
