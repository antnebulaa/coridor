'use client';

import { usePathname, useRouter } from "@/i18n/navigation";
import Link from "next/link";
import { User, Shield, Lock, Bell, FileText, Globe, ChevronRight, Home, Repeat, Settings, Wallet, Sparkles, BellRing } from "lucide-react";
import { SafeUser } from "@/types";
import { useState } from "react";
import { motion } from "framer-motion";
import { switchUserMode } from "@/app/actions/switchMode";
import { toast } from "react-hot-toast";
import CustomToast from "@/components/ui/CustomToast";
import Avatar from "@/components/Avatar";
import { useTranslations } from 'next-intl';

interface AccountSidebarProps {
    currentUser?: SafeUser | null;
}

const AccountSidebar: React.FC<AccountSidebarProps> = ({ currentUser }) => {
    const pathname = usePathname();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const t = useTranslations('account.navigation');

    const toggleMode = async () => {
        setIsLoading(true);
        try {
            await switchUserMode();
            router.refresh();
            toast.custom((tToast) => (
                <CustomToast
                    t={tToast}
                    message={t('mode.success')}
                    type="success"
                />
            ));
        } catch (error) {
            toast.custom((tToast) => (
                <CustomToast
                    t={tToast}
                    message={t('mode.error')}
                    type="error"
                />
            ));
        } finally {
            setIsLoading(false);
        }
    }

    const routes = [
        ...(currentUser?.userMode === 'LANDLORD' ? [{
            label: t('finances'),
            icon: Wallet,
            href: '/dashboard/finances',
            active: pathname === '/dashboard/finances'
        }] : []),
        {
            label: t('tenantProfile'),
            icon: FileText,
            href: '/account/tenant-profile',
            active: pathname === '/account/tenant-profile'
        },
        {
            label: t('project'),
            icon: Home,
            href: '/account/project',
            active: pathname === '/account/project'
        },
        {
            label: t('security'),
            icon: Shield,
            href: '/account/security',
            active: pathname === '/account/security'
        },
        {
            label: t('notifications'),
            icon: Bell,
            href: '/account/notifications',
            active: pathname === '/account/notifications'
        },
        {
            label: t('alerts'),
            icon: BellRing,
            href: '/account/alerts',
            active: pathname === '/account/alerts'
        },
        {
            label: t('privacy'),
            icon: Lock,
            href: '/account/privacy',
            active: pathname === '/account/privacy'
        },
        {
            label: t('preferences'),
            icon: Globe,
            href: '/account/preferences',
            active: pathname === '/account/preferences'
        },
        {
            label: t('subscription'),
            icon: Sparkles,
            href: '/pricing',
            active: pathname === '/pricing'
        },
        {
            label: t('settings'),
            icon: Settings,
            href: '/account/settings',
            active: pathname === '/account/settings'
        },
    ];
    const names = currentUser?.name?.split(' ') || ['User'];
    const firstName = names[0];
    const lastInitial = names.length > 1 ? `${names[names.length - 1][0]}.` : '';

    const plan = (currentUser as any)?.plan || 'FREE';
    let planLabel = t('plan.free');
    let planStyles = 'bg-neutral-100 text-neutral-600 border border-neutral-200';

    if (plan === 'PLUS') {
        planLabel = t('plan.plus');
        planStyles = 'bg-red-500 text-white border border-red-500';
    } else if (plan === 'PRO') {
        planLabel = t('plan.pro');
        planStyles = 'bg-neutral-800 text-white border border-black';
    }

    return (
        <div className="relative">
            <div className="flex flex-col gap-3 pt-6 md:pt-4 -mx-1 md:mx-0 pb-24 md:pb-0" >
                <Link
                    href="/account/personal-info"
                    className="flex justify-between items-center p-5 sm:p-4 rounded-3xl bg-neutral-50 hover:shadow-md transition mb-2 group cursor-pointer"
                >
                    <div className="flex items-center gap-4">
                        <div className="shrink-0">
                            <Avatar src={currentUser?.image} size={52} />
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 flex-wrap pb-0.5">
                                <span className="font-medium text-neutral-900 text-xl leading-none">{firstName} {lastInitial}</span>
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider ${planStyles}`}>
                                    {planLabel}
                                </span>
                            </div>
                            <span className="text-sm text-neutral-500 font-normal group-hover:text-black transition">{t('personalInfo')}</span>
                        </div>
                    </div>
                    <ChevronRight size={20} className="text-neutral-400 group-hover:text-black transition" />
                </Link>

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
                            <route.icon size={24} className="text-neutral-700" />
                            <div className="font-medium text-neutral-700">
                                {route.label}
                            </div>
                        </div>
                        <ChevronRight size={20} className="text-neutral-700 md:hidden" />
                    </Link>
                ))}
            </div>

            {
                currentUser && (
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
                            {t('mode.switch', { mode: currentUser.userMode === 'LANDLORD' ? t('mode.tenant') : t('mode.landlord') })}
                        </motion.button>
                    </div>
                )
            }
        </div >
    );
}

export default AccountSidebar;
