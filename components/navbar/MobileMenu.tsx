'use client';

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Heart, LayoutDashboard, User, Home } from "lucide-react";
import { SafeUser } from "@/types";
import useLoginModal from "@/hooks/useLoginModal";
import useSearchModal from "@/hooks/useSearchModal";
import { motion } from "framer-motion";
import useConversation from "@/hooks/useConversation";

interface MobileMenuProps {
    currentUser?: SafeUser | null;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ currentUser }) => {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const loginModal = useLoginModal();
    const searchModal = useSearchModal();
    const [activePath, setActivePath] = useState(pathname);

    useEffect(() => {
        setActivePath(pathname);
    }, [pathname]);

    const routes = [
        {
            label: 'Accueil',
            icon: Home,
            href: '/',
            active: activePath === '/'
        },
        {
            label: 'Favoris',
            icon: Heart,
            href: '/favorites',
            active: activePath === '/favorites'
        },
        {
            label: 'Dashboard',
            icon: LayoutDashboard,
            href: '/dashboard',
            active: activePath === '/dashboard'
        },
        {
            label: 'Profil',
            icon: User,
            href: currentUser?.userMode === 'TENANT' ? '/account/tenant-profile' : '/account/personal-info',
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

    const { isOpen } = useConversation();
    const isContentMode = searchParams?.get('view') === 'content';

    if (isOpen || isContentMode) {
        return null;
    }

    return (
        <div className="fixed bottom-6 w-full z-50 md:hidden px-4 pointer-events-none">
            <div className="flex flex-row items-center justify-between gap-2 max-w-[400px] mx-auto">
                {/* Main Menu Pill */}
                <div className="flex-1 bg-[#f1f1f1] backdrop-blur-md rounded-full shadow-2xl pointer-events-auto border border-white">
                    <div className="flex flex-row items-center justify-between p-1">
                        {routes.map((route) => (
                            <div
                                key={route.label}
                                onClick={() => handleClick(route.href)}
                                className="relative flex-1 flex items-center justify-center cursor-pointer py-1 px-1"
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
                                    ${route.active ? 'text-white' : 'text-[#212121] hover:text-black'}
                                `}>
                                    <route.icon size={20} />
                                    <div className="text-[0.68rem] font-medium">
                                        {route.label}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Search Button */}
                <motion.div
                    whileTap={{ scale: 0.9 }}
                    onClick={searchModal.onOpen}
                    className={`
                        bg-[#f1f1f1] hover:bg-neutral-200
                        backdrop-blur-md 
                        p-4 
                        rounded-full 
                        shadow-2xl 
                        cursor-pointer 
                        pointer-events-auto
                        text-[#212121]
                        transition
                        flex
                        items-center
                        justify-center
                        border border-white
                    `}
                >
                    <Search size={24} />
                </motion.div>
            </div>
        </div>
    );
}

export default MobileMenu;
