'use client';

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { User, Shield, Lock, Bell, FileText, Globe, ChevronRight, Home, Repeat, Settings } from "lucide-react";
import { SafeUser } from "@/types";
import { useState } from "react";
import { motion } from "framer-motion";
import { switchUserMode } from "@/app/actions/switchMode";
import { toast } from "react-hot-toast";

interface AccountSidebarProps {
    currentUser?: SafeUser | null;
}

const AccountSidebar: React.FC<AccountSidebarProps> = ({ currentUser }) => {
    const pathname = usePathname();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const toggleMode = async () => {
        setIsLoading(true);
        try {
            await switchUserMode();
            router.refresh();
            toast.success('Mode changé avec succès');
        } catch (error) {
            toast.error('Une erreur est survenue');
        } finally {
            setIsLoading(false);
        }
    }

    const routes = [
        {
            label: 'Personal info',
            icon: User,
            href: '/account/personal-info',
            active: pathname === '/account/personal-info'
        },
        {
            label: 'Dossier Locataire',
            icon: FileText,
            href: '/account/tenant-profile',
            active: pathname === '/account/tenant-profile'
        },
        {
            label: 'Projet de location',
            icon: Home,
            href: '/account/project',
            active: pathname === '/account/project'
        },
        {
            label: 'Login & security',
            icon: Shield,
            href: '/account/security',
            active: pathname === '/account/security'
        },
        {
            label: 'Notifications',
            icon: Bell,
            href: '/account/notifications',
            active: pathname === '/account/notifications'
        },
        {
            label: 'Privacy & sharing',
            icon: Lock,
            href: '/account/privacy',
            active: pathname === '/account/privacy'
        },
        {
            label: 'Global preferences',
            icon: Globe,
            href: '/account/preferences',
            active: pathname === '/account/preferences'
        },
        {
            label: 'Réglages',
            icon: Settings,
            href: '/account/settings',
            active: pathname === '/account/settings'
        },
    ];

    return (
        <div className="relative">
            <div className="flex flex-col gap-2 pt-6 md:pt-0 -mx-1 md:mx-0 pb-24 md:pb-0">
                {routes.map((route) => (
                    <Link
                        key={route.label}
                        href={route.href}
                        className={`
                            flex 
                            items-center 
                            justify-between
                            gap-4 
                            p-[9px] 
                            hover:bg-secondary 
                            transition 
                            rounded-xl
                            w-full
                            ${route.active ? 'bg-secondary' : ''}
                        `}
                    >
                        <div className="flex items-center gap-4">
                            <route.icon size={24} className="text-foreground" />
                            <div className="font-light text-foreground">
                                {route.label}
                            </div>
                        </div>
                        <ChevronRight size={20} className="text-foreground md:hidden" />
                    </Link>
                ))}
            </div>

            {currentUser && (
                <div className="md:hidden fixed bottom-24 left-1/2 -translate-x-1/2 z-40 whitespace-nowrap">
                    <motion.button
                        onClick={toggleMode}
                        disabled={isLoading}
                        whileTap={{ scale: 0.95 }}
                        className="
                            bg-card 
                            border 
                            border-border 
                            shadow-xl 
                            px-5 
                            py-3 
                            rounded-full 
                            font-semibold 
                            text-sm
                            flex
                            items-center
                            gap-2
                            hover:bg-secondary
                            transition
                            disabled:opacity-50
                            text-foreground
                        "
                    >
                        <motion.div
                            animate={{ rotate: currentUser.userMode === 'LANDLORD' ? 0 : 360 }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                        >
                            <Repeat size={16} />
                        </motion.div>
                        Passer en mode {currentUser.userMode === 'LANDLORD' ? 'locataire' : 'propriétaire'}
                    </motion.button>
                </div>
            )}
        </div>
    );
}

export default AccountSidebar;
