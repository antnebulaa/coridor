'use client';

import clsx from "clsx";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { HiFaceSmile, HiEllipsisHorizontal } from "react-icons/hi2";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";

import { FullMessageType, SafeMessage } from "@/types";
import Avatar from "@/components/Avatar";
import { HiCheck, HiClock, HiCalendarDays } from "react-icons/hi2";
import ImageModal from "./ImageModal";
import MessageMenu from "./MessageMenu";
import AddToCalendarButton from "@/components/calendar/AddToCalendarButton";

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
    confirmedVisit?: {
        id: string;
        date: string;
        startTime: string;
        endTime: string;
    } | null;
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
    showDossier,
    confirmedVisit
}) => {
    const t = useTranslations('inbox');
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
        toast.success(t('form.toasts.reaction', { emoji }));
    };

    const handleAction = (action: string) => {
        onCloseMenu();
        if (action === 'copy') {
            if (data.body) {
                navigator.clipboard.writeText(data.body);
                toast.success(t('form.toasts.copy'));
            }
        } else if (action === 'reply') {
            // Logic to populate input would go here
            console.log('Reply to:', data.id);
        } else if (action === 'report') {
            toast.success(t('form.toasts.report'));
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

                            ) : data.body?.startsWith('VISIT_CONFIRMED|') ? (
                                (() => {
                                    const parts = data.body?.split('|') || [];
                                    const dateStr = parts[1];
                                    const timeStr = parts[2];

                                    // Build calendar event
                                    const safeListing = data.listing as any;
                                    const roomInfo = safeListing?.roomCount ? `T${safeListing.roomCount}` : (safeListing?.category || 'Visite');
                                    const surfaceInfo = safeListing?.surface ? ` ${safeListing.surface}m²` : '';
                                    const title = `Visite - ${roomInfo}${surfaceInfo} à ${safeListing?.city || ''}`;
                                    const partsAddr = [
                                        safeListing?.addressLine1,
                                        safeListing?.zipCode,
                                        safeListing?.city
                                    ].filter(Boolean);
                                    const location = partsAddr.join(' ');

                                    const calendarEvent = {
                                        title,
                                        date: dateStr,
                                        startTime: timeStr,
                                        location,
                                    };

                                    let formattedDate = dateStr;
                                    try {
                                        formattedDate = format(new Date(dateStr), 'dd/MM/yyyy');
                                    } catch (e) { }

                                    return (
                                        <div className={clsx(
                                            "flex flex-col gap-2 bg-neutral-100 p-4 rounded-[19px]",
                                            isOwn ? "rounded-br-none" : "rounded-bl-none"
                                        )}>
                                            <div className="font-medium text-gray-900">
                                                {!isOwn ? t('message.visit.confirmedTitleYou') : t('message.visit.confirmedTitle')}
                                                <br />{t('message.visit.confirmedDetails', { date: formattedDate, time: timeStr })}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                                                    {timeStr}
                                                </div>
                                                <div className="text-xs text-green-600 font-medium">
                                                    {t('message.visit.confirmedBadge')}
                                                </div>
                                            </div>

                                            <div className="mt-2">
                                                <AddToCalendarButton
                                                    event={calendarEvent}
                                                    variant="compact"
                                                />
                                            </div>
                                        </div>
                                    );
                                })()

                            ) : data.body === 'INVITATION_VISITE' ? (
                                (() => {
                                    if (confirmedVisit) {
                                        const dateStr = confirmedVisit.date;
                                        const timeStr = confirmedVisit.startTime;
                                        let formattedDate = dateStr;
                                        try {
                                            formattedDate = format(new Date(dateStr), 'dd/MM/yyyy');
                                        } catch (e) { }
                                        return (
                                            <div className={clsx(
                                                "flex flex-col gap-2 bg-white border border-gray-200 p-4 rounded-2xl",
                                                isOwn ? "rounded-br-none" : "rounded-bl-none"
                                            )}>
                                                <div className="font-medium text-gray-900">
                                                    {!isOwn ? t('message.visit.confirmedTitleYou') : t('message.visit.confirmedTitle')}
                                                    <br /> {t('message.visit.confirmedDetails', { date: formattedDate, time: timeStr })}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                                                        {timeStr}
                                                    </div>
                                                    <div className="text-xs text-green-600 font-medium">
                                                        {t('message.visit.confirmedBadge')}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className={clsx(
                                            "flex flex-col gap-2 bg-white border border-gray-200 p-4 rounded-2xl",
                                            isOwn ? "rounded-br-none" : "rounded-bl-none"
                                        )}>
                                            <div className="font-medium text-gray-900">
                                                {t('message.visit.invitation', { name: data.sender?.name || 'Le propriétaire' })}
                                            </div>
                                            <div className="text-gray-500 mb-2">
                                                {t('message.visit.instruction')}
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
                                                {t('message.visit.chooseSlot')}
                                            </button>
                                        </div>
                                    );
                                })()
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
                                            {t('message.application.appliedFor')}
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
                                                {t('message.application.viewDossier')}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenListingRecap && onOpenListingRecap();
                                                }}
                                                className="w-fit ml-auto px-8 py-3 bg-neutral-100 dark:bg-neutral-800 rounded-[19px] text-center font-medium text-sm text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                                            >
                                                {t('message.application.viewRecap')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {(() => {
                                        if (!data.body) return null;

                                        // Simple regex for [text](url) markdown links
                                        // And also fallback for raw URLs if needed?
                                        // The current format is: "... [Télécharger le Document](url)"

                                        const parts = data.body.split(/(\[.*?\]\(.*?\))/g);

                                        return (
                                            <div className="whitespace-pre-wrap">
                                                {parts.map((part, i) => {
                                                    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
                                                    if (linkMatch) {
                                                        const [_, text, url] = linkMatch;
                                                        return (
                                                            <a
                                                                key={i}
                                                                href={url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="underline font-semibold hover:opacity-80"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {text}
                                                            </a>
                                                        );
                                                    }
                                                    return <span key={i}>{part}</span>;
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* File Attachment */}
                            {data.fileUrl && !data.image && (
                                <div className="flex flex-col gap-2">
                                    <a
                                        href={data.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={clsx(
                                            "flex items-center gap-3 p-3 rounded-lg border max-w-xs transition hover:bg-black/5",
                                            isOwn ? "bg-white/10 border-white/20 text-white" : "bg-white border-gray-200 text-gray-900"
                                        )}
                                    >
                                        <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                            </svg>
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-sm font-medium truncate w-full">
                                                {data.fileName || t('message.attachment.defaultName')}
                                            </span>
                                            <span className="text-xs opacity-70 uppercase">
                                                {data.fileType || t('message.attachment.defaultType')}
                                            </span>
                                        </div>
                                    </a>
                                </div>
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
                            {t('conversation.seenBy', { names: seenList })}
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
        </div >
    );
}

export default MessageBox;
