'use client';

import {
    Menu,
    MessageSquare,
    CircleGauge,
    Heart,
    Wallet,
    Key,
    Users,
    QrCode,
    Sparkles,
    Settings,
    Calendar
} from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import Avatar from "../Avatar";
import { useCallback, useState, useRef, useEffect } from "react";
import useRegisterModal from "@/hooks/useRegisterModal";
import useLoginModal from "@/hooks/useLoginModal";
import useRentModal from "@/hooks/useRentModal";
import useMyCodeModal from "@/hooks/useMyCodeModal";
import CustomToast from "../ui/CustomToast";
import { SafeUser } from "@/types";
import { signOut } from "next-auth/react";
import { useRouter, usePathname, Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";

interface UserMenuProps {
    currentUser?: SafeUser | null;
    unreadCount?: number;
}

const UserMenu: React.FC<UserMenuProps> = ({
    currentUser,
    unreadCount
}) => {
    const router = useRouter();
    const pathname = usePathname();
    const t = useTranslations('nav');
    const tLang = useTranslations('language');
    const locale = useLocale();

    const registerModal = useRegisterModal();
    const loginModal = useLoginModal();
    const rentModal = useRentModal();
    const myCodeModal = useMyCodeModal();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const switchLanguage = useCallback((newLocale: string) => {
        router.replace(pathname, { locale: newLocale as 'fr' | 'en' });
    }, [pathname, router]);

    const toggleOpen = useCallback(() => {
        setIsOpen((value) => !value);
    }, []);

    const onRent = useCallback(() => {
        if (!currentUser) {
            return loginModal.onOpen();
        }

        rentModal.onOpen();
    }, [currentUser, loginModal, rentModal]);

    const toggleMode = useCallback(() => {
        if (!currentUser) {
            return loginModal.onOpen();
        }

        const newMode = currentUser.userMode === 'LANDLORD' ? 'TENANT' : 'LANDLORD';

        axios.post('/api/settings', { userMode: newMode })
            .then(() => {
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message={`Mode ${newMode === 'LANDLORD' ? 'Propriétaire' : 'Locataire'} activé`}
                        type="success"
                    />
                ));
                router.refresh();
            })
            .catch(() => {
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Une erreur est survenue."
                        type="error"
                    />
                ));
            });
    }, [currentUser, loginModal, router]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Format name: First Name + First Letter of Last Name
    const formattedName = currentUser?.name ? (() => {
        const names = currentUser.name.split(' ');
        if (names.length > 1) {
            return `${names[0]} ${names[names.length - 1][0]}.`;
        }
        return names[0];
    })() : '';

    return (
        <div className="relative" ref={menuRef}>
            <div className="flex flex-row items-center gap-3">
                <div
                    onClick={onRent}
                    className="
            hidden
            md:block
            text-sm 
            font-medium 
            py-3 
            px-4 
            rounded-full 
            hover:bg-neutral-100 
            dark:hover:bg-neutral-800
            transition 
            cursor-pointer
          "
                >
                    {t('rentMyProperty')}
                </div>
                <div
                    onClick={toggleOpen}
                    className="
            relative
            p-4
            md:py-1
            md:px-2
            border 
            border-border 
            hidden
            md:flex 
            flex-row 
            items-center 
            gap-3 
            rounded-full 
            cursor-pointer 
            hover:shadow-md 
            transition
          "
                >
                    <Menu size={18} strokeWidth={3} />
                    {unreadCount && unreadCount > 0 ? (
                        <div className="absolute top-0 right-0 h-3 w-3 bg-primary rounded-full border-2 border-background" />
                    ) : null}
                    <div className="hidden md:block relative">
                        {currentUser?.userMode !== 'LANDLORD' && (currentUser as any)?.pseudonymEmoji ? (
                            <>
                                <Avatar src={null} seed={(currentUser as any).pseudonymFull} size={30} />
                                <span className="absolute inset-0 flex items-center justify-center text-lg drop-shadow-sm">
                                    {(currentUser as any).pseudonymEmoji}
                                </span>
                            </>
                        ) : (
                            <Avatar src={currentUser?.image} seed={currentUser?.email || currentUser?.name} />
                        )}
                    </div>
                </div>
            </div>
            {isOpen && (
                <div
                    className="
            absolute
            rounded-2xl
            shadow-xl
            w-[260px]
            bg-popover
            border border-border
            overflow-hidden
            right-0
            top-12
            text-popover-foreground
            z-9999
            "
                >
                    <div className="flex flex-col">
                        {currentUser ? (
                            <>
                                {/* Header */}
                                <div className="p-4 flex flex-col gap-1">
                                    <div className="font-semibold text-lg">{formattedName}</div>
                                    <div className="text-muted-foreground text-sm mb-3">{currentUser.email}</div>
                                    <Link
                                        href="/account/personal-info"
                                        onClick={() => setIsOpen(false)}
                                        className="
                      w-full
                      py-2
                      rounded-full
                      bg-secondary
                      hover:bg-secondary/80
                      transition
                      text-sm
                      font-medium
                      block
                      text-center
                    "
                                    >
                                        {t('editProfile')}
                                    </Link>
                                </div>

                                <hr className="border-border w-full" />

                                {/* Menu Items */}
                                <div className="flex flex-col p-2 font-medium gap-1">
                                    <Link
                                        href="/dashboard"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-4 p-2 hover:bg-secondary rounded-xl transition"
                                    >
                                        <CircleGauge size={24} className="text-neutral-700" />
                                        <span className="font-medium text-neutral-700">{t('dashboard')}</span>
                                    </Link>

                                    <Link
                                        href="/inbox"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center justify-between p-2 hover:bg-secondary rounded-xl transition"
                                    >
                                        <div className="flex items-center gap-4">
                                            <MessageSquare size={24} className="text-neutral-700" />
                                            <span className="font-medium text-neutral-700">{t('messages')}</span>
                                        </div>
                                        {unreadCount && unreadCount > 0 ? (
                                            <div className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                                {unreadCount}
                                            </div>
                                        ) : null}
                                    </Link>

                                    <Link
                                        href="/favorites"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-4 p-2 hover:bg-secondary rounded-xl transition"
                                    >
                                        <Heart size={24} className="text-neutral-700" />
                                        <span className="font-medium text-neutral-700">{t('favorites')}</span>
                                    </Link>

                                    <Link
                                        href="/calendar"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-4 p-2 hover:bg-secondary rounded-xl transition"
                                    >
                                        <Calendar size={24} className="text-neutral-700" />
                                        <span className="font-medium text-neutral-700">{t('agenda')}</span>
                                    </Link>

                                    {currentUser.userMode === 'LANDLORD' ? (
                                        <>
                                            <Link
                                                href="/finances"
                                                onClick={() => setIsOpen(false)}
                                                className="flex items-center gap-4 p-2 hover:bg-secondary rounded-xl transition"
                                            >
                                                <Wallet size={24} className="text-neutral-700" />
                                                <span className="font-medium text-neutral-700">{t('finances')}</span>
                                            </Link>
                                            <Link
                                                href="/properties"
                                                onClick={() => setIsOpen(false)}
                                                className="flex items-center gap-4 p-2 hover:bg-secondary rounded-xl transition"
                                            >
                                                <Key size={24} className="text-neutral-700" />
                                                <span className="font-medium text-neutral-700">{t('properties')}</span>
                                            </Link>
                                        </>
                                    ) : (
                                        <Link
                                            href="/rentals"
                                            onClick={() => setIsOpen(false)}
                                            className="flex items-center gap-4 p-2 hover:bg-secondary rounded-xl transition"
                                        >
                                            <Key size={24} className="text-neutral-700" />
                                            <span className="font-medium text-neutral-700">{t('myRental')}</span>
                                        </Link>
                                    )}

                                    <Link
                                        href="/contacts"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-4 p-2 hover:bg-secondary rounded-xl transition"
                                    >
                                        <Users size={24} className="text-neutral-700" />
                                        <span className="font-medium text-neutral-700">{t('contacts')}</span>
                                    </Link>

                                    <Link
                                        href="/pricing"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-4 p-2 hover:bg-secondary rounded-xl transition"
                                    >
                                        <Sparkles size={24} className="text-neutral-700" />
                                        <span className="font-medium text-neutral-700">{t('subscription')}</span>
                                    </Link>

                                    <Link
                                        href="/account/settings"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-4 p-2 hover:bg-secondary rounded-xl transition"
                                    >
                                        <Settings size={24} className="text-neutral-700" />
                                        <span className="font-medium text-neutral-700">{t('settings')}</span>
                                    </Link>

                                    <div className="flex items-center justify-between p-2 hover:bg-secondary rounded-xl cursor-pointer transition">
                                        <span className="font-medium text-neutral-700">{t('mode')}</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleMode();
                                            }}
                                            className="
                        bg-secondary 
                        px-3 
                        py-1 
                        rounded-full 
                        text-sm 
                        font-medium 
                        border 
                        border-border
                        hover:border-foreground/50
                        transition
                      "
                                        >
                                            {currentUser.userMode === 'LANDLORD' ? t('tenant') : t('landlord')}
                                        </button>
                                    </div>

                                    {/* Language Switch */}
                                    <div className="flex items-center justify-between p-2 hover:bg-secondary rounded-xl cursor-pointer transition">
                                        <span className="font-medium text-neutral-700">{tLang('select')}</span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    switchLanguage('fr');
                                                }}
                                                className={`
                                                    px-2 
                                                    py-1 
                                                    rounded-md 
                                                    text-xs 
                                                    font-medium 
                                                    border 
                                                    transition
                                                    ${locale === 'fr'
                                                        ? 'bg-neutral-800 text-white border-neutral-800'
                                                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                                                    }
                                                `}
                                            >
                                                FR
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    switchLanguage('en');
                                                }}
                                                className={`
                                                    px-2 
                                                    py-1 
                                                    rounded-md 
                                                    text-xs 
                                                    font-medium 
                                                    border 
                                                    transition
                                                    ${locale === 'en'
                                                        ? 'bg-neutral-800 text-white border-neutral-800'
                                                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                                                    }
                                                `}
                                            >
                                                EN
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <hr className="border-border w-full" />

                                {/* Logout */}
                                <div className="p-2">
                                    <div
                                        onClick={() => signOut()}
                                        className="flex items-center gap-4 p-2 hover:bg-secondary rounded-xl cursor-pointer transition"
                                    >
                                        <span className="font-medium text-neutral-700">{t('logout')}</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col p-2">
                                <div
                                    onClick={loginModal.onOpen}
                                    className="px-4 py-3 hover:bg-secondary rounded-lg cursor-pointer transition font-semibold"
                                >
                                    {t('login')}
                                </div>
                                <div
                                    onClick={registerModal.onOpen}
                                    className="px-4 py-3 hover:bg-secondary rounded-lg cursor-pointer transition"
                                >
                                    {t('register')}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )
            }
        </div >
    );
}

export default UserMenu;
