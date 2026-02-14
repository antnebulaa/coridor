'use client';

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Heart, LayoutDashboard, User, Home, Building2, MessageSquare, Calendar, Bell } from "lucide-react";
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
    const router = useRouter();
    const searchParams = useSearchParams();
    const loginModal = useLoginModal();
    const [activePath, setActivePath] = useState(pathname);
    const [isMounted, setIsMounted] = useState(false);

    const { isOpen } = useConversation();
    const isContentMode = searchParams?.get('view') === 'content';
    const isTenantProfile = pathname?.startsWith('/account/tenant-profile');
    const isPropertyEdit = pathname?.includes('/edit');

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        setActivePath(pathname);
    }, [pathname]);

    const t = useTranslations('nav');

    if (!isMounted || isOpen || isContentMode || isTenantProfile || isPropertyEdit) {
        return null;
    }

    const routes = [
        {
            label: currentUser?.userMode === 'LANDLORD' ? t('agenda') : t('home'),
            icon: currentUser?.userMode === 'LANDLORD' ? Calendar : Home,
            href: '/',
            active: activePath === '/'
        },
        currentUser?.userMode === 'LANDLORD' ? {
            label: t('properties'),
            icon: Building2,
            href: '/properties',
            active: activePath === '/properties'
        } : {
            label: t('favorites'),
            icon: Heart,
            href: '/favorites',
            active: activePath === '/favorites'
        },
        {
            label: t('dashboard'),
            icon: LayoutDashboard,
            href: '/dashboard',
            active: activePath === '/dashboard'
        },
        {
            label: t('messages'),
            icon: MessageSquare,
            href: '/inbox',
            active: activePath === '/inbox'
        },
        {
            label: t('profile'),
            icon: User,
            href: '/account',
            active: activePath?.startsWith('/account')
        }
    ];

    const handleClick = (href: string) => {
        if (!currentUser && href !== '/') {
            return loginModal.onOpen();
        }
        setActivePath(href);
        router.push(href);
    }

    return (
        <div
            id="bottom-nav"
            className="fixed bottom-6 w-full z-2000 md:hidden px-4 pointer-events-none"
        >
            <div className="flex flex-row items-center justify-center max-w-[400px] mx-auto">
                {/* Main Menu Pill */}
                <div className="flex-1 bg-card/70 backdrop-blur-md rounded-full shadow-2xl pointer-events-auto border border-border">
                    <div className="flex flex-row items-center justify-between p-1">
                        {routes.map((route) => (
                            <div
                                key={route.label}
                                onClick={() => handleClick(route.href)}
                                className="relative flex-1 flex items-center justify-center cursor-pointer py-2 px-1"
                            >
                                {route.active && (
                                    <motion.div
                                        layoutId="active-bubble"
                                        className="absolute inset-0 bg-primary rounded-full"
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
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MobileMenu;
