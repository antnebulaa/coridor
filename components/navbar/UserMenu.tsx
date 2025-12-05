'use client';

import { AiOutlineMenu } from "react-icons/ai";
import { IoSettingsOutline, IoLogOutOutline, IoHeartOutline, IoKeyOutline } from "react-icons/io5";
import { MessageSquare } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import Avatar from "../Avatar";
import { useCallback, useState, useRef, useEffect } from "react";
import useRegisterModal from "@/hooks/useRegisterModal";
import useLoginModal from "@/hooks/useLoginModal";
import useRentModal from "@/hooks/useRentModal";
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
                toast.success(`Mode ${newMode === 'LANDLORD' ? 'Propriétaire' : 'Locataire'} activé`);
                router.refresh();
            })
            .catch(() => {
                toast.error('Une erreur est survenue.');
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
            border-[1px] 
            border-[#dfdfdf] 
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
                    <AiOutlineMenu />
                    {unreadCount && unreadCount > 0 ? (
                        <div className="absolute top-0 right-0 h-3 w-3 bg-primary rounded-full border-2 border-white" />
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
            bg-[#414141] 
            overflow-hidden 
            right-0 
            top-12 
            text-white
            z-50
          "
                >
                    <div className="flex flex-col">
                        {currentUser ? (
                            <>
                                {/* Header */}
                                <div className="p-4 flex flex-col gap-1">
                                    <div className="font-semibold text-lg">{formattedName}</div>
                                    <div className="text-neutral-300 text-sm mb-3">{currentUser.email}</div>
                                    <button
                                        onClick={() => router.push('/account/personal-info')}
                                        className="
                      w-full 
                      py-2 
                      rounded-full 
                      bg-[#505050] 
                      hover:bg-[#5D5D5D] 
                      transition 
                      text-sm 
                      font-medium
                    "
                                    >
                                        Modifier profil
                                    </button>
                                </div>

                                <hr className="border-neutral-600 w-full" />

                                {/* Menu Items */}
                                <div className="flex flex-col p-2">
                                    <div
                                        onClick={() => router.push('/inbox')}
                                        className="flex items-center justify-between px-3 py-2 hover:bg-[#505050] rounded-lg cursor-pointer transition"
                                    >
                                        <div className="flex items-center gap-3">
                                            <MessageSquare size={20} className="text-neutral-300" strokeWidth={2} />
                                            <span>Messages</span>
                                        </div>
                                        {unreadCount && unreadCount > 0 ? (
                                            <div className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                                {unreadCount}
                                            </div>
                                        ) : null}
                                    </div>

                                    <div
                                        onClick={() => router.push('/favorites')}
                                        className="flex items-center gap-3 px-3 py-2 hover:bg-[#505050] rounded-lg cursor-pointer transition"
                                    >
                                        <IoHeartOutline size={20} className="text-neutral-300" strokeWidth="40" />
                                        <span>Favoris</span>
                                    </div>

                                    {currentUser.userMode === 'LANDLORD' ? (
                                        <div
                                            onClick={() => router.push('/properties')}
                                            className="flex items-center gap-3 px-3 py-2 hover:bg-[#505050] rounded-lg cursor-pointer transition"
                                        >
                                            <IoKeyOutline size={20} className="text-neutral-300" strokeWidth="40" />
                                            <span>Mes locations</span>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => router.push('/rentals')}
                                            className="flex items-center gap-3 px-3 py-2 hover:bg-[#505050] rounded-lg cursor-pointer transition"
                                        >
                                            <IoKeyOutline size={20} className="text-neutral-300" strokeWidth="40" />
                                            <span>Ma location</span>
                                        </div>
                                    )}

                                    <div
                                        onClick={() => router.push('/account')}
                                        className="flex items-center gap-3 px-3 py-2 hover:bg-[#505050] rounded-lg cursor-pointer transition"
                                    >
                                        <IoSettingsOutline size={20} className="text-neutral-300" strokeWidth="40" />
                                        <span>Réglages</span>
                                    </div>

                                    {/* Mode Switch */}
                                    <div className="flex items-center justify-between px-3 py-2 hover:bg-[#505050] rounded-lg cursor-pointer transition">
                                        <span>Mode</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleMode();
                                            }}
                                            className="
                        bg-[#505050] 
                        px-3 
                        py-1 
                        rounded-full 
                        text-sm 
                        font-medium 
                        border-[1px] 
                        border-neutral-600
                        hover:border-neutral-400
                        transition
                      "
                                        >
                                            {currentUser.userMode === 'LANDLORD' ? 'Locataire' : 'Propriétaire'}
                                        </button>
                                    </div>
                                </div>

                                <hr className="border-neutral-600 w-full" />

                                {/* Logout */}
                                <div className="p-2">
                                    <div
                                        onClick={() => signOut()}
                                        className="flex items-center gap-3 px-3 py-2 hover:bg-[#505050] rounded-lg cursor-pointer transition"
                                    >
                                        <span>Déconnexion</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col p-2">
                                <div
                                    onClick={loginModal.onOpen}
                                    className="px-4 py-3 hover:bg-[#505050] rounded-lg cursor-pointer transition font-semibold"
                                >
                                    Connexion
                                </div>
                                <div
                                    onClick={registerModal.onOpen}
                                    className="px-4 py-3 hover:bg-[#505050] rounded-lg cursor-pointer transition"
                                >
                                    Inscription
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserMenu;
