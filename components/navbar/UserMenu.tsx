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
import { useRouter } from "next/navigation";

interface UserMenuProps {
    currentUser?: SafeUser | null;
    unreadCount?: number;
}

const UserMenu: React.FC<UserMenuProps> = ({
    currentUser,
    unreadCount
}) => {
    const router = useRouter();
    const registerModal = useRegisterModal();
    const loginModal = useLoginModal();
    const rentModal = useRentModal();
    const myCodeModal = useMyCodeModal();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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
                    Louer mon bien
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
                    <div className="hidden md:block">
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                console.log("Manual refresh triggered");
                                axios.get('/api/user/counters').then((res) => {
                                    console.log("Manual refresh result:", res.data);
                                    window.location.reload();
                                });
                            }}
                            className="bg-gray-100 hover:bg-gray-200 text-xs rounded px-1 cursor-pointer mr-2"
                            title="Debug: Refresh Counters"
                        >
                            ↻
                        </div>
                    </div>
                    {unreadCount && unreadCount > 0 ? (
                        <div className="absolute top-0 right-0 h-3 w-3 bg-primary rounded-full border-2 border-background" />
                    ) : null}
                    <div className="hidden md:block">
                        <Avatar src={currentUser?.image} seed={currentUser?.email || currentUser?.name} />
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
                                    <button
                                        onClick={() => router.push('/account/personal-info')}
                                        className="
                      w-full 
                      py-2 
                      rounded-full 
                      bg-secondary 
                      hover:bg-secondary/80 
                      transition 
                      text-sm 
                      font-medium
                    "
                                    >
                                        Modifier profil
                                    </button>
                                </div>

                                <hr className="border-border w-full" />

                                {/* Menu Items */}
                                <div className="flex flex-col p-2 font-medium gap-1">
                                    <div
                                        onClick={() => router.push('/dashboard')}
                                        className="flex items-center gap-4 p-2 hover:bg-secondary rounded-xl cursor-pointer transition"
                                    >
                                        <CircleGauge size={24} className="text-neutral-700" />
                                        <span className="font-medium text-neutral-700">Tableau de bord</span>
                                    </div>

                                    <div
                                        onClick={() => router.push('/inbox')}
                                        className="flex items-center justify-between p-2 hover:bg-secondary rounded-xl cursor-pointer transition"
                                    >
                                        <div className="flex items-center gap-4">
                                            <MessageSquare size={24} className="text-neutral-700" />
                                            <span className="font-medium text-neutral-700">Messages</span>
                                        </div>
                                        {unreadCount && unreadCount > 0 ? (
                                            <div className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                                {unreadCount}
                                            </div>
                                        ) : null}
                                    </div>

                                    <div
                                        onClick={() => router.push('/favorites')}
                                        className="flex items-center gap-4 p-2 hover:bg-secondary rounded-xl cursor-pointer transition"
                                    >
                                        <Heart size={24} className="text-neutral-700" />
                                        <span className="font-medium text-neutral-700">Favoris</span>
                                    </div>

                                    <div
                                        onClick={() => router.push('/calendar')}
                                        className="flex items-center gap-4 p-2 hover:bg-secondary rounded-xl cursor-pointer transition"
                                    >
                                        <Calendar size={24} className="text-neutral-700" />
                                        <span className="font-medium text-neutral-700">Mon Calendrier</span>
                                    </div>

                                    {currentUser.userMode === 'LANDLORD' ? (
                                        <>
                                            <div
                                                onClick={() => router.push('/dashboard/finances')}
                                                className="flex items-center gap-4 p-2 hover:bg-secondary rounded-xl cursor-pointer transition"
                                            >
                                                <Wallet size={24} className="text-neutral-700" />
                                                <span className="font-medium text-neutral-700">Mes finances</span>
                                            </div>
                                            <div
                                                onClick={() => router.push('/properties')}
                                                className="flex items-center gap-4 p-2 hover:bg-secondary rounded-xl cursor-pointer transition"
                                            >
                                                <Key size={24} className="text-neutral-700" />
                                                <span className="font-medium text-neutral-700">Mes locations</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div
                                            onClick={() => router.push('/rentals')}
                                            className="flex items-center gap-4 p-2 hover:bg-secondary rounded-xl cursor-pointer transition"
                                        >
                                            <Key size={24} className="text-neutral-700" />
                                            <span className="font-medium text-neutral-700">Ma location</span>
                                        </div>
                                    )}

                                    <div
                                        onClick={() => router.push('/contacts')}
                                        className="flex items-center gap-4 p-2 hover:bg-secondary rounded-xl cursor-pointer transition"
                                    >
                                        <Users size={24} className="text-neutral-700" />
                                        <span className="font-medium text-neutral-700">Mes contacts</span>
                                    </div>


                                    <div
                                        onClick={() => router.push('/pricing')}
                                        className="flex items-center gap-4 p-2 hover:bg-secondary rounded-xl cursor-pointer transition"
                                    >
                                        <Sparkles size={24} className="text-neutral-700" />
                                        <span className="font-medium text-neutral-700">Abonnement</span>
                                    </div>

                                    <div
                                        onClick={() => router.push('/account/settings')}
                                        className="flex items-center gap-4 p-2 hover:bg-secondary rounded-xl cursor-pointer transition"
                                    >
                                        <Settings size={24} className="text-neutral-700" />
                                        <span className="font-medium text-neutral-700">Réglages</span>
                                    </div>

                                    {/* Mode Switch */}
                                    <div className="flex items-center justify-between p-2 hover:bg-secondary rounded-xl cursor-pointer transition">
                                        <span className="font-medium text-neutral-700">Mode</span>
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
                                            {currentUser.userMode === 'LANDLORD' ? 'Locataire' : 'Propriétaire'}
                                        </button>
                                    </div>
                                </div>

                                <hr className="border-border w-full" />

                                {/* Logout */}
                                <div className="p-2">
                                    <div
                                        onClick={() => signOut()}
                                        className="flex items-center gap-4 p-2 hover:bg-secondary rounded-xl cursor-pointer transition"
                                    >
                                        <span className="font-medium text-neutral-700">Déconnexion</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col p-2">
                                <div
                                    onClick={loginModal.onOpen}
                                    className="px-4 py-3 hover:bg-secondary rounded-lg cursor-pointer transition font-semibold"
                                >
                                    Connexion
                                </div>
                                <div
                                    onClick={registerModal.onOpen}
                                    className="px-4 py-3 hover:bg-secondary rounded-lg cursor-pointer transition"
                                >
                                    Inscription
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
