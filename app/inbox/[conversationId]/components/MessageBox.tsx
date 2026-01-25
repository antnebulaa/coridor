'use client';

import clsx from "clsx";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { HiFaceSmile, HiEllipsisHorizontal } from "react-icons/hi2";
import { toast } from "react-hot-toast";

import { FullMessageType, SafeMessage } from "@/types";
import Avatar from "@/components/Avatar";
import { HiCheck, HiClock } from "react-icons/hi2";
import ImageModal from "./ImageModal";
import MessageMenu from "./MessageMenu";

interface MessageBoxProps {
    data: SafeMessage | FullMessageType;
    isLast?: boolean;
    onOpenVisitSlots?: () => void;
    onToggleDossier?: () => void;
    onOpenListingRecap?: () => void;
    isMenuOpen: boolean;
    onOpenMenu: () => void;
    onCloseMenu: () => void;
    showDossier?: boolean;
}

const MessageBox: React.FC<MessageBoxProps> = ({
    data,
    isLast,
    onOpenVisitSlots,
    onToggleDossier,
    onOpenListingRecap,
    isMenuOpen,
    onOpenMenu,
    onCloseMenu,
    showDossier
}) => {
    const session = useSession();
    const [imageModalOpen, setImageModalOpen] = useState(false);

    const [menuTrigger, setMenuTrigger] = useState<'button' | 'message' | null>(null);
    const [menuMode, setMenuMode] = useState<'all' | 'reactions' | 'actions'>('all');

    // Long press logic
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isLongPress = useRef(false);

    const startPressTimer = () => {
        isLongPress.current = false;
        timerRef.current = setTimeout(() => {
            isLongPress.current = true;
            setMenuTrigger('message');
            setMenuMode('all'); // Long press shows everything
            onOpenMenu();
            // Vibrate if supported (for mobile feel)
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, 500);
    };

    const handlePressEnd = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
    };

    // prevent context menu on mobile long press
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
    };

    const isOwn = session?.data?.user?.email === data.sender?.email;
    const seenList = (data.seen || [])
        .filter((user) => user.email !== data.sender?.email)
        .map((user) => user.name)
        .join(', ');

    const container = clsx(
        "flex gap-3 p-4 group relative", // Add group and relative
        isOwn && "justify-end"
    );

    const avatar = clsx(isOwn && "order-2");

    const body = clsx(
        "flex flex-col gap-2",
        isOwn && "items-end"
    );

    const message = clsx(
        "text-[15px] w-fit transition select-none !ring-0 !outline-none !border-none", // Select none to prevent text selection on long press
        // isMenuOpen && "scale-95 brightness-95", // Removed as per user feedback
        data.body === 'INVITATION_VISITE' ? "p-0" :
            (data.image || data.listing) ? "rounded-md p-0 overflow-hidden" :
                clsx(
                    "overflow-hidden py-2 px-3",
                    isOwn ? "bg-primary text-white rounded-2xl rounded-br-none" : "bg-gray-100 rounded-2xl rounded-bl-none"
                )
    );

    const isTemp = data.id.startsWith('temp-');

    const handleReaction = (emoji: string) => {
        // Here we would implement the backend mutation
        console.log('Reaction:', emoji);
        onCloseMenu();
        toast.success(`Réaction ${emoji} ajoutée`);
    };

    const handleAction = (action: string) => {
        onCloseMenu();
        if (action === 'copy') {
            if (data.body) {
                navigator.clipboard.writeText(data.body);
                toast.success('Message copié !');
            }
        } else if (action === 'reply') {
            // Logic to populate input would go here
            console.log('Reply to:', data.id);
        } else if (action === 'report') {
            toast.success('Message signalé.');
        }
    };

    return (
        <div className={container} onClick={(e) => {
            // Stop propagation if clicking on message bubble actions so it doesn't close immediately via Body click
            // But Body click handles closing 'activeMessageId(null)', so if we click another message, it sets active to that. 
            // If we click the SAME message, we might toggle? 
            // For now Body click is "background".
            // We need to prevent immediate close if we click ON the menu (handled in Menu)
            // If we click the bubble, maybe we want to toggle?
            e.stopPropagation();
            // Maybe if we click the bubble and it's NOT open, we do nothing (desktop). on Mobile long press opens. 
            // We'll let the buttons handle open.
        }}>
            {!isOwn && (
                <div className={avatar}>
                    <Avatar src={data.sender?.image} seed={data.sender?.email || data.sender?.name} />
                </div>
            )}

            {/* Main Content + Hover Buttons Wrapper */}
            <div className={clsx("flex items-end gap-2 max-w-[70%] relative", isOwn ? "flex-row-reverse" : "flex-row")}>

                <div className={body}>
                    <div className="flex items-center gap-1">
                        {!isOwn && (
                            <div className="text-sm text-gray-500">
                                {data.sender?.name}
                            </div>
                        )}
                        <div className="text-xs text-gray-500">
                            {format(new Date(data.createdAt), 'p')}
                        </div>
                        {isOwn && (
                            <div className="text-xs text-gray-400">
                                {isTemp ? <HiClock size={14} /> : <HiCheck size={14} />}
                            </div>
                        )}
                    </div>

                    <div className="relative w-fit">
                        {/* Mobile/Long-Press Menu Trigger */}
                        {isMenuOpen && menuTrigger === 'message' && (
                            <MessageMenu
                                isOpen={isMenuOpen}
                                onClose={onCloseMenu}
                                isOwn={isOwn}
                                onReaction={handleReaction}
                                onAction={handleAction}
                                mode={menuMode}
                            />
                        )}

                        <div
                            className={message}
                            onTouchStart={startPressTimer}
                            onTouchEnd={handlePressEnd}
                            onTouchMove={handlePressEnd} // Cancel if moved
                            onMouseDown={startPressTimer}
                            onMouseUp={handlePressEnd}
                            onMouseLeave={handlePressEnd}
                            onContextMenu={handleContextMenu}
                        >
                            <ImageModal src={data.image} isOpen={imageModalOpen} onClose={() => setImageModalOpen(false)} />
                            {data.image ? (
                                <Image
                                    onClick={() => setImageModalOpen(true)}
                                    alt="Image"
                                    height="288"
                                    width="288"
                                    src={data.image}
                                    className="
                                    object-cover 
                                    cursor-pointer 
                                    hover:scale-110 
                                    transition 
                                    translate
                                "
                                />
                            ) : data.body === 'INVITATION_VISITE' ? (
                                <div className={clsx(
                                    "flex flex-col gap-2 bg-white border border-gray-200 p-4 rounded-2xl",
                                    isOwn ? "rounded-br-none" : "rounded-bl-none"
                                )}>
                                    <div className="font-medium text-gray-900">
                                        {data.sender?.name || 'Le propriétaire'} est intéressé par votre profil et vous propose une visite.
                                    </div>
                                    <div className="text-gray-500 mb-2">
                                        Veuillez choisir un horaire parmi les créneaux disponibles.
                                    </div>
                                    <button
                                        disabled={!data.listingId || !onOpenVisitSlots}
                                        onClick={(e) => {
                                            e.stopPropagation(); // prevent long press trigger on button click
                                            onOpenVisitSlots && onOpenVisitSlots();
                                        }}
                                        className="
                                        px-4 py-2 bg-black text-white rounded-lg text-sm font-medium
                                        hover:bg-neutral-800 transition w-fit
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                    "
                                    >
                                        Choisir un horaire
                                    </button>
                                </div>
                            ) : data.listing && (data.listing as any).images ? (
                                <div className="flex flex-col gap-2">
                                    {data.body && (
                                        <div className={clsx(
                                            "box-border w-fit overflow-hidden py-2 px-3",
                                            isOwn ? "bg-primary text-white rounded-2xl rounded-br-none ml-auto" : "bg-gray-100 rounded-2xl rounded-bl-none"
                                        )}>
                                            {data.body}
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-2 w-[calc(100vw-80px)] sm:w-80 max-w-full">
                                        <div className="text-sm text-neutral-500 ml-1">
                                            a candidaté pour
                                        </div>
                                        {/* Compact Listing Card */}
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenListingRecap && onOpenListingRecap();
                                            }}
                                            className="flex items-center gap-3 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-[19px] cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                                        >
                                            <div className="relative w-[50px] h-[50px] shrink-0 rounded-[12px] overflow-hidden">
                                                <Image
                                                    fill
                                                    src={(data.listing as any).images[0]?.url || '/images/placeholder.jpg'}
                                                    alt="Listing"
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <div className="font-medium text-base text-neutral-900 dark:text-white truncate">
                                                    {(() => {
                                                        const l = data.listing as any;
                                                        if (l.category && l.propertyAdjective) {
                                                            return `${l.category} ${l.propertyAdjective}`;
                                                        }
                                                        return l.title;
                                                    })()}
                                                </div>
                                                <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                                                    {(data.listing as any).city || 'Localisation inconnue'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Dossier Button */}
                                        {showDossier ? (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onToggleDossier && onToggleDossier();
                                                }}
                                                className="w-fit ml-auto px-8 py-3 bg-neutral-100 dark:bg-neutral-800 rounded-[19px] text-center font-medium text-sm text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                                            >
                                                Voir le dossier de candidature
                                            </button>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenListingRecap && onOpenListingRecap();
                                                }}
                                                className="w-fit ml-auto px-8 py-3 bg-neutral-100 dark:bg-neutral-800 rounded-[19px] text-center font-medium text-sm text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                                            >
                                                Voir le récapitulatif
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div>{data.body}</div>
                            )}
                        </div>
                    </div>

                    {/* Seen List - Moved back here */}
                    {isLast && isOwn && seenList.length > 0 && (
                        <div className="
                                text-xs 
                                font-light 
                                text-gray-500
                                text-right
                                mt-1
                            ">
                            {`Seen by ${seenList}`}
                        </div>
                    )}
                </div>

                {/* Desktop Hover Action Buttons */}
                <div className={clsx(
                    "hidden lg:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-75 mb-4 relative", // Added relative
                    isMenuOpen && "opacity-100" // Keep visible if menu open
                )}>
                    {/* Desktop/Button Menu Trigger */}
                    {isMenuOpen && menuTrigger === 'button' && (
                        <MessageMenu
                            isOpen={isMenuOpen}
                            onClose={onCloseMenu}
                            isOwn={isOwn}
                            onReaction={handleReaction}
                            onAction={handleAction}
                            mode={menuMode}
                        />
                    )}

                    <div className="relative group/emoji">
                        <button
                            onClick={() => {
                                setMenuTrigger('button');
                                setMenuMode('reactions');
                                onOpenMenu();
                            }}
                            className="p-1.5 rounded-full bg-white border border-gray-100 shadow-sm text-gray-500 hover:text-yellow-500 hover:scale-110 transition"
                        >
                            <HiFaceSmile size={18} />
                        </button>
                    </div>
                    <div className="relative group/more">
                        <button
                            onClick={() => {
                                setMenuTrigger('button');
                                setMenuMode('actions');
                                onOpenMenu();
                            }}
                            className="p-1.5 rounded-full bg-white border border-gray-100 shadow-sm text-gray-500 hover:text-black hover:scale-110 transition"
                        >
                            <HiEllipsisHorizontal size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MessageBox;
