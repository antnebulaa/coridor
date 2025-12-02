'use client';

import { usePathname } from "next/navigation";
import Link from "next/link";
import { User, Shield, Lock, Bell, FileText, CreditCard, Globe, Briefcase, Building, Wrench, ChevronRight } from "lucide-react";

const AccountSidebar = () => {
    const pathname = usePathname();

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
            label: 'Login & security',
            icon: Shield,
            href: '/account/security',
            active: pathname === '/account/security'
        },
        {
            label: 'Payments & payouts',
            icon: CreditCard,
            href: '/account/payments',
            active: pathname === '/account/payments'
        },
        {
            label: 'Taxes',
            icon: FileText,
            href: '/account/taxes',
            active: pathname === '/account/taxes'
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
            label: 'Travel for work',
            icon: Briefcase,
            href: '/account/travel',
            active: pathname === '/account/travel'
        },
        {
            label: 'Professional hosting tools',
            icon: Wrench,
            href: '/account/pro-tools',
            active: pathname === '/account/pro-tools'
        },
        {
            label: 'Refer a host',
            icon: Building,
            href: '/account/referrals',
            active: pathname === '/account/referrals'
        },
    ];

    return (
        <div className="flex flex-col gap-2 pt-6 md:pt-0 -mx-1 md:mx-0">
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
            hover:bg-neutral-100 
            transition 
            rounded-xl
            w-full
            ${route.active ? 'bg-neutral-100' : ''}
          `}
                >
                    <div className="flex items-center gap-4">
                        <route.icon size={24} className="text-[#262626]" />
                        <div className="font-light text-[#262626]">
                            {route.label}
                        </div>
                    </div>
                    <ChevronRight size={20} className="text-[#262626] md:hidden" />
                </Link>
            ))}
        </div>
    );
}

export default AccountSidebar;
