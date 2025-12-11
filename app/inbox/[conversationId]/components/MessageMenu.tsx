'use client';

import { useState, useRef, useEffect } from 'react';

import { clsx } from 'clsx';
import { HiFlag, HiReply, HiClipboard, HiOutlineEmojiHappy, HiDotsHorizontal, HiEye } from 'react-icons/hi';
import { toast } from 'react-hot-toast';

interface MessageMenuProps {
    isOpen: boolean;
    onClose: () => void;
    isOwn: boolean;
    onReaction: (emoji: string) => void;
    onAction: (action: string) => void;
    mode?: 'all' | 'reactions' | 'actions';
}

const MessageMenu: React.FC<MessageMenuProps> = ({
    isOpen,
    onClose,
    isOwn,
    onReaction,
    onAction,
    mode = 'all'
}) => {
    if (!isOpen) return null;

    const [placement, setPlacement] = useState<'top' | 'bottom'>('top');
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            // Default is 'top' (bottom-full) -> Above anchor
            // placement 'bottom' (top-full) -> Below anchor

            // 1. If too close to top (header), force BELOW
            if (rect.top < 140) {
                setPlacement('bottom');
            }
            // 2. If too close to bottom (footer/screen edge), force ABOVE
            // This overrides the top check if we are somehow squeezed, but usually bottom check is for when we are low down.
            // If rect.bottom is large (near innerHeight), we are low.
            // If we are low, we want 'top' (Above). Since default is 'top', this is mostly a safeguard
            // in case some other logic interferes or if we want to be explicit.
            // However, let's say we defaulted to bottom for some reason, this would fix it.
            // But main issue might be if the element is taller than available space?
            // For now, explicit check:
            else if (rect.bottom > window.innerHeight - 100) {
                setPlacement('top');
            }
        }
    }, []);

    const emojis = ['😊', '❤️', '👍', '👏', '🤣'];

    const showReactions = mode === 'all' || mode === 'reactions';
    const showActions = mode === 'all' || mode === 'actions';

    return (
        <div
            ref={menuRef}
            className={clsx(
                "absolute z-50 flex flex-col gap-2 min-w-[200px] pointer-events-auto",
                placement === 'top' ? "bottom-full mb-2" : "top-full mt-2",
                isOwn ? "left-0 items-start" : "right-0 items-end"
            )}
        >
            {/* Overlay for clicking outside - simpler to handle in parent or use a fixed overlay here */}
            {/* But for now, we rely on parent's click handling or we add a fixed inset-0 div */}
            <div
                className="fixed inset-0 z-40"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
            />

            <div className="relative z-50 flex flex-col gap-2 motion-scale-in-[0.5] motion-opacity-in-[0%] motion-blur-in-[5px] motion-duration-[0.25s] motion-duration-[0.38s]/scale motion-ease-spring-bouncier">
                {/* Emoji Bar */}
                {showReactions && (
                    <div className="bg-white rounded-full shadow-lg p-2 flex gap-2 justify-between items-center px-4 self-start">
                        {emojis.map((emoji) => (
                            <button
                                key={emoji}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onReaction(emoji);
                                }}
                                className="hover:scale-125 transition text-2xl"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}

                {/* Actions Menu */}
                {showActions && (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col py-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onAction('copy');
                            }}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-100 transition text-left text-sm font-medium text-neutral-700"
                        >
                            <HiClipboard size={18} />
                            Copier
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onAction('reply');
                            }}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-100 transition text-left text-sm font-medium text-neutral-700"
                        >
                            <HiReply size={18} />
                            Répondre
                        </button>
                        {!isOwn && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAction('report');
                                }}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-100 transition text-left text-sm font-medium text-neutral-700"
                            >
                                <HiFlag size={18} />
                                Signaler ce message
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessageMenu;
