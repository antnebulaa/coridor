'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    isRead: boolean;
    createdAt: string;
}

interface NotificationCenterProps {
    currentUser?: any;
    redirectToPage?: boolean;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ currentUser, redirectToPage }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const fetchNotifications = useCallback(async () => {
        if (!currentUser) return;
        try {
            const response = await axios.get('/api/notifications');
            const data = response.data;
            setNotifications(data);
            setUnreadCount(data.filter((n: Notification) => !n.isRead).length);
        } catch {
            // Silently ignore — can happen before auth session is ready
        }
    }, [currentUser]);

    // Initial fetch and polling every 60s
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const markAsRead = async (id: string, link?: string) => {
        try {
            // Optimistic update
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));

            // API call
            await axios.patch(`/api/notifications/${id}`, { isRead: true });

            if (link) {
                setIsOpen(false);
                router.push(link);
            }
        } catch (error) {
            console.error("Failed to mark as read");
        }
    };

    const markAllAsRead = async () => {
        setIsLoading(true);
        try {
            // We need a bulk update endpoint or just loop? 
            // For now, let's just loop locally or assume user marks one by one. 
            // Or create a new endpoint? 
            // Let's iterate client side for simplicity for now, or better:
            // Just mark visible ones as read? 
            // Actually I didn't create a bulk endpoint.
            // I'll skip "Mark All" button logic implementation for this iteration to accept individual clicks.
            // Or I can just trigger it for unread ones.
            const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
            await Promise.all(unreadIds.map(id => axios.patch(`/api/notifications/${id}`, { isRead: true })));

            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
            toast.success("Tout est lu !");
        } catch (error) {
            toast.error("Erreur");
        } finally {
            setIsLoading(false);
        }
    };

    if (!currentUser) return null;

    const handleClick = () => {
        if (redirectToPage) {
            router.push('/notifications');
        } else {
            setIsOpen(!isOpen);
        }
    }

    return (
        <div className="relative" ref={menuRef}>
            <div
                onClick={handleClick}
                className="
                    relative 
                    cursor-pointer 
                    p-2 
                    rounded-full 
                    hover:bg-neutral-100 
                    dark:hover:bg-neutral-800 
                    transition
                "
            >
                <Bell size={20} className="text-neutral-600 dark:text-neutral-300" />
                {unreadCount > 0 && (
                    <div className="
                        absolute 
                        top-0 
                        right-0 
                        h-4 
                        w-4 
                        bg-red-500 
                        text-white 
                        text-[10px] 
                        font-bold 
                        flex 
                        items-center 
                        justify-center 
                        rounded-full
                        border-2
                        border-white
                        dark:border-black
                    ">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                )}
            </div>

            {isOpen && (
                <div className="
                    absolute 
                    right-0 
                    top-12 
                    w-80 
                    bg-white 
                    dark:bg-neutral-900 
                    border 
                    border-neutral-200 
                    dark:border-neutral-800 
                    rounded-xl 
                    shadow-xl 
                    overflow-hidden 
                    z-50
                ">
                    <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900">
                        <h3 className="font-semibold text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                disabled={isLoading}
                                className="text-xs text-primary hover:underline font-medium"
                            >
                                Tout lire
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-neutral-500 text-sm">
                                Aucune notification
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => markAsRead(notification.id, notification.link)}
                                    className={`
                                        p-4 
                                        border-b 
                                        border-neutral-100 
                                        dark:border-neutral-800 
                                        hover:bg-neutral-50 
                                        dark:hover:bg-neutral-800/50 
                                        transition 
                                        cursor-pointer
                                        ${!notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}
                                    `}
                                >
                                    <div className="flex gap-3">
                                        <div className={`
                                            mt-1 
                                            h-2 
                                            w-2 
                                            rounded-full 
                                            shrink-0
                                            ${!notification.isRead ? 'bg-blue-500' : 'bg-transparent'}
                                        `} />
                                        <div className="flex flex-col gap-1">
                                            <p className={`text-sm ${!notification.isRead ? 'font-semibold text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>
                                                {notification.title}
                                            </p>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-[10px] text-neutral-400 mt-1">
                                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: fr })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationCenter;
