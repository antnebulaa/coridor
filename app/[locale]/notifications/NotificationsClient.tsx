'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { Bell, ArrowLeft } from 'lucide-react';
import { SafeUser } from "@/types";

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    isRead: boolean;
    createdAt: string;
}

interface NotificationsClientProps {
    currentUser: SafeUser | null;
}

const NotificationsClient: React.FC<NotificationsClientProps> = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await axios.get('/api/notifications');
                setNotifications(response.data);
            } catch (error) {
                console.error("Failed to fetch notifications", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNotifications();
    }, []);

    const markAsRead = async (id: string, link?: string) => {
        try {
            // Optimistic update
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            await axios.patch(`/api/notifications/${id}`, { isRead: true });

            if (link) {
                router.push(link);
            }
        } catch (_error) {
            console.error("Failed to mark as read", _error);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-neutral-500">Chargement...</div>;
    }

    return (
        <div className="max-w-2xl mx-auto pt-4 pb-20">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-neutral-100 rounded-full transition md:hidden"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Bell className="w-6 h-6" />
                    Notifications
                </h1>
            </div>

            {notifications.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 bg-neutral-50 dark:bg-neutral-900 rounded-xl">
                    Aucune notification pour le moment
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            onClick={() => markAsRead(notification.id, notification.link)}
                            className={`
                                p-4 
                                rounded-xl
                                border 
                                border-neutral-200 
                                dark:border-neutral-800 
                                hover:border-neutral-300
                                dark:hover:border-neutral-700
                                transition 
                                cursor-pointer
                                relative
                                ${!notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10 shadow-sm' : 'bg-white dark:bg-background'}
                            `}
                        >
                            <div className="flex gap-4">
                                <div className={`
                                    mt-1.5 
                                    h-2.5 
                                    w-2.5 
                                    rounded-full 
                                    shrink-0
                                    ${!notification.isRead ? 'bg-blue-500' : 'bg-neutral-200 dark:bg-neutral-700'}
                                `} />
                                <div className="flex flex-col gap-1 w-full">
                                    <div className="flex justify-between items-start gap-2">
                                        <p className={`text-sm ${!notification.isRead ? 'font-semibold text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                            {notification.title}
                                        </p>
                                        <span className="text-[10px] text-neutral-400 whitespace-nowrap">
                                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: fr })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                        {notification.message}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default NotificationsClient;
