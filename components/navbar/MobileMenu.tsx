'use client';

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { Heart, LayoutDashboard, Settings, Home, Building2, MessageSquare, Calendar } from "lucide-react";
import { SafeUser } from "@/types";
import useLoginModal from "@/hooks/useLoginModal";
import { motion } from "framer-motion";
import useConversation from "@/hooks/useConversation";

import useUserCounters from "@/hooks/useUserCounters";
import { useTranslations } from "next-intl";

interface MobileMenuProps {
    currentUser?: SafeUser | null;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ currentUser }) => {
    const { unreadCount, hasPendingAlert, notificationCount } = useUserCounters(currentUser);
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const loginModal = useLoginModal();
    const [isMounted, setIsMounted] = useState(false);

    const { isOpen } = useConversation();
    const isContentMode = searchParams?.get('view') === 'content';
    const isTenantProfile = pathname?.startsWith('/account/tenant-profile');
    const isPropertyEdit = pathname?.includes('/edit');

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const t = useTranslations('nav');

    const isAdmin = pathname?.includes('/admin');
    const isInspection = pathname?.includes('/inspection');
    if (!isMounted || isOpen || isContentMode || isTenantProfile || isPropertyEdit || isAdmin || isInspection) {
        return null;
    }

    const routes = [
        {
            label: currentUser?.userMode === 'LANDLORD' ? t('agenda') : t('home'),
            icon: currentUser?.userMode === 'LANDLORD' ? Calendar : Home,
            href: '/' as const,
            active: pathname === '/'
        },
        currentUser?.userMode === 'LANDLORD' ? {
            label: t('properties'),
            icon: Building2,
            href: '/properties' as const,
            active: pathname === '/properties'
        } : {
            label: t('favorites'),
            icon: Heart,
            href: '/favorites' as const,
            active: pathname === '/favorites'
        },
        {
            label: t('dashboard'),
            icon: LayoutDashboard,
            href: '/dashboard' as const,
            active: pathname === '/dashboard'
        },
        {
            label: t('messages'),
            icon: MessageSquare,
            href: '/inbox' as const,
            active: pathname === '/inbox'
        },
        {
            label: t('settings'),
            icon: Settings,
            href: '/account' as const,
            active: pathname?.startsWith('/account')
        }
    ];

    const handleClick = (e: React.MouseEvent, href: string) => {
        if (!currentUser && href !== '/') {
            e.preventDefault();
            loginModal.onOpen();
            return;
        }
        import('@/lib/haptics').then(({ hapticLight }) => hapticLight());
    }

    return (
        <div
            id="bottom-nav"
            className="fixed bottom-0 left-0 right-0 z-2000 md:hidden pointer-events-none"
        >
            {/* Gradient fade — fills the gap between pill and screen edge */}
            <div className="bg-linear-to-b from-transparent via-background/50 to-background/80 pt-6 pb-safe-nav px-4">
                <div className="flex flex-row items-center justify-center max-w-[400px] mx-auto">
                    {/* Main Menu Pill */}
                    <div className="flex-1 bg-card/70 backdrop-blur-md rounded-3xl shadow-2xl pointer-events-auto border border-border">
                        <div className="flex flex-row items-center justify-between p-1">
                            {routes.map((route) => (
                                <Link
                                    key={route.label}
                                    href={route.href}
                                    onClick={(e) => handleClick(e, route.href)}
                                    className="relative flex-1 flex items-center justify-center cursor-pointer py-2 px-1"
                                >
                                    {route.active && (
                                        <motion.div
                                            layoutId="active-bubble"
                                            className="absolute inset-0 bg-[#854020] rounded-[20px]"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <div className={`
                                        relative
                                        z-10
                                        flex
                                        flex-col
                                        items-center
                                        justify-center
                                        gap-1
                                        transition-colors
                                        duration-200
                                        ${route.active ? 'text-primary-foreground' : 'text-foreground hover:text-foreground'}
                                    `}>
                                        <div className="relative">
                                            <route.icon size={20} />
                                            {route.label === 'Messages' && !!unreadCount && (
                                                <div className="absolute top-0 -right-2 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border border-background">
                                                    {unreadCount > 99 ? '99+' : unreadCount}
                                                </div>
                                            )}
                                            {route.label === 'Notifs' && !!notificationCount && (
                                                <div className="absolute top-0 -right-2 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border border-background">
                                                    {notificationCount > 99 ? '99+' : notificationCount}
                                                </div>
                                            )}
                                            {route.label === 'Dashboard' && hasPendingAlert && (
                                                <div className="absolute top-0 -right-1 bg-red-500 w-2.5 h-2.5 rounded-full border border-background" />
                                            )}
                                        </div>
                                        <div className="text-[0.68rem] font-medium">
                                            {route.label}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MobileMenu;
