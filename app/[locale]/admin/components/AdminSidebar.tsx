'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LayoutDashboard, Home, Users, BarChart3, ArrowLeft } from 'lucide-react';

const NAV_ITEMS = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/admin/listings', label: 'Annonces', icon: Home },
    { href: '/admin/users', label: 'Utilisateurs', icon: Users },
    { href: '/admin/polls', label: 'Sondages', icon: BarChart3 },
];

const AdminSidebar: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // Close on escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen]);

    // Prevent body scroll when mobile sidebar is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const toggle = useCallback(() => setIsOpen(prev => !prev), []);

    const isActive = (href: string, exact?: boolean) => {
        // Strip locale prefix for comparison
        const clean = pathname.replace(/^\/[a-z]{2}(?=\/)/, '');
        if (exact) return clean === href;
        return clean.startsWith(href);
    };

    const sidebarContent = (
        <>
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h1 className="text-xl font-bold tracking-wider">CORIDOR ADMIN</h1>
                <button
                    onClick={toggle}
                    className="md:hidden p-1 text-slate-400 hover:text-white transition"
                >
                    <X size={20} />
                </button>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {NAV_ITEMS.map(item => {
                    const active = isActive(item.href, item.exact);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition text-sm font-medium ${
                                active
                                    ? 'bg-slate-800 text-white'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                        >
                            <item.icon size={18} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <Link
                    href="/"
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm px-4 py-2"
                >
                    <ArrowLeft size={16} />
                    <span>Retour au site</span>
                </Link>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile top bar */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 text-white flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <button
                    onClick={toggle}
                    className="p-1.5 rounded-lg hover:bg-slate-800 transition"
                >
                    <Menu size={22} />
                </button>
                <h1 className="text-sm font-bold tracking-wider">CORIDOR ADMIN</h1>
                <div className="w-[34px]" /> {/* Spacer for centering */}
            </div>

            {/* Desktop sidebar (always visible) */}
            <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col fixed h-full inset-y-0 z-50">
                {sidebarContent}
            </aside>

            {/* Mobile sidebar (overlay) */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="md:hidden fixed inset-0 bg-black/50 z-[60]"
                        onClick={toggle}
                    />
                    {/* Sidebar panel */}
                    <aside className="md:hidden fixed inset-y-0 left-0 w-72 bg-slate-900 text-white flex flex-col z-[70]">
                        {sidebarContent}
                    </aside>
                </>
            )}
        </>
    );
};

export default AdminSidebar;
