'use client';

import { usePathname, useRouter } from "@/i18n/navigation";
import Link from "next/link";
import { Shield, Lock, Bell, FileText, Globe, ChevronRight, Repeat, Sparkles, HelpCircle, LucideIcon } from "lucide-react";
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

interface RouteItem {
    label: string;
    icon: LucideIcon;
    href: string;
    active: boolean;
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

    const accountRoutes: RouteItem[] = [
        {
            label: t('identityDocuments'),
            icon: FileText,
            href: '/account/personal-info',
            active: pathname === '/account/personal-info'
        },
        {
            label: t('security'),
            icon: Shield,
            href: '/account/security',
            active: pathname === '/account/security'
        },
        {
            label: t('subscription'),
            icon: Sparkles,
            href: '/account/subscription',
            active: pathname === '/account/subscription'
        },
    ];

    const preferencesRoutes: RouteItem[] = [
        {
            label: t('notifications'),
            icon: Bell,
            href: '/account/notifications',
            active: pathname === '/account/notifications'
        },
        {
            label: t('privacy'),
            icon: Lock,
            href: '/account/privacy',
            active: pathname === '/account/privacy'
        },
        {
            label: t('generalPreferences'),
            icon: Globe,
            href: '/account/preferences',
            active: pathname === '/account/preferences'
        },
    ];

    const renderRoute = (route: RouteItem) => (
        <Link
            key={route.href}
            href={route.href}
            className={`
                flex items-center justify-between gap-4
                py-2.5 px-3
                hover:bg-secondary transition rounded-2xl w-full
                ${route.active ? 'bg-secondary' : ''}
            `}
        >
            <div className="flex items-center gap-3.5">
                <route.icon size={20} className="text-neutral-600" />
                <span className="text-[15px] text-neutral-700">{route.label}</span>
            </div>
            <ChevronRight size={18} className="text-neutral-400 md:hidden" />
        </Link>
    );

    return (
        <div className="relative">
            <div className="flex flex-col pt-6 md:pt-4 -mx-1 md:mx-0 pb-24 md:pb-0">
                {/* Header — profile card */}
                <Link
                    href="/account/personal-info"
                    className="flex justify-between items-center p-5 sm:p-4 rounded-3xl bg-neutral-50 hover:shadow-md transition mb-4 group cursor-pointer"
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

                {/* Mon compte */}
                <div className="mb-4">
                    <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-3 mb-1.5">
                        {t('sectionAccount')}
                    </h3>
                    <div className="flex flex-col gap-0.5">
                        {accountRoutes.map(renderRoute)}
                    </div>
                </div>

                {/* Préférences */}
                <div className="mb-4">
                    <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-3 mb-1.5">
                        {t('sectionPreferences')}
                    </h3>
                    <div className="flex flex-col gap-0.5">
                        {preferencesRoutes.map(renderRoute)}
                    </div>
                </div>

                {/* Aide & contact */}
                <div>
                    <Link
                        href="/account/settings"
                        className={`
                            flex items-center justify-between gap-4
                            py-2.5 px-3
                            hover:bg-secondary transition rounded-2xl w-full
                            ${pathname === '/account/settings' ? 'bg-secondary' : ''}
                        `}
                    >
                        <div className="flex items-center gap-3.5">
                            <HelpCircle size={20} className="text-neutral-600" />
                            <span className="text-[15px] text-neutral-700">{t('helpContact')}</span>
                        </div>
                        <ChevronRight size={18} className="text-neutral-400 md:hidden" />
                    </Link>
                </div>
            </div>

            {currentUser && (
                <div className="md:hidden fixed bottom-24 left-1/2 -translate-x-1/2 z-40 whitespace-nowrap">
                    <motion.button
                        onClick={toggleMode}
                        disabled={isLoading}
                        whileTap={{ scale: 0.95 }}
                        className="
                            bg-card border border-border shadow-xl
                            px-5 py-3 rounded-full
                            font-semibold text-sm
                            flex items-center gap-2
                            hover:bg-secondary transition
                            disabled:opacity-50 text-foreground
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
            )}
        </div>
    );
}

export default AccountSidebar;
