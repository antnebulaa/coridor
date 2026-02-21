'use client';

import { Drawer } from 'vaul';
import { ReactNode } from 'react';

interface BottomSheetProps {
    children: ReactNode;
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    trigger?: ReactNode;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
    children,
    isOpen,
    onClose,
    title,
    trigger
}) => {
    return (
        <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            {trigger && (
                <Drawer.Trigger asChild>
                    {trigger}
                </Drawer.Trigger>
            )}
            <Drawer.Portal>
                <Drawer.Overlay
                    className="fixed inset-0 bg-black/40 z-[9999]"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                />
                <Drawer.Content
                    className="bg-white dark:bg-neutral-900 flex flex-col rounded-t-[20px] fixed bottom-0 left-0 right-0 z-[9999] outline-none pb-16 max-h-[90vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-neutral-300 mb-2 mt-3" />
                    <Drawer.Title className="sr-only">
                        {title || "Menu"}
                    </Drawer.Title>

                    {children}
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
};

export default BottomSheet;
