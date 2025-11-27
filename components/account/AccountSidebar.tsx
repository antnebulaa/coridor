'use client';

import { usePathname } from "next/navigation";
import Link from "next/link";
import { User, Shield, Lock, Bell, FileText, CreditCard, Globe, Briefcase, Building, Wrench } from "lucide-react";

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
        <div className="flex flex-col gap-2">
            {routes.map((route) => (
                <Link
                    key={route.label}
                    href={route.href}
                    className={`
            flex 
            items-center 
            gap-4 
            p-4 
            hover:bg-neutral-100 
            transition 
            rounded-xl
            ${route.active ? 'bg-neutral-100' : ''}
          `}
                >
                    <route.icon size={24} className="text-neutral-500" />
                    <div className="font-light text-neutral-500">
                        {route.label}
                    </div>
                </Link>
            ))}
        </div>
    );
}

export default AccountSidebar;
