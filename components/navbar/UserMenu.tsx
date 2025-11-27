'use client';

import { AiOutlineMenu } from "react-icons/ai";
import axios from "axios";
import { toast } from "react-hot-toast";
import Avatar from "../Avatar";
import { useCallback, useState } from "react";
import MenuItem from "./MenuItem";
import useRegisterModal from "@/hooks/useRegisterModal";
import useLoginModal from "@/hooks/useLoginModal";
import useRentModal from "@/hooks/useRentModal";
import { SafeUser } from "@/types";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

interface UserMenuProps {
    currentUser?: SafeUser | null;
}

const UserMenu: React.FC<UserMenuProps> = ({
    currentUser
}) => {
    const router = useRouter();
    const registerModal = useRegisterModal();
    const loginModal = useLoginModal();
    const rentModal = useRentModal();
    const [isOpen, setIsOpen] = useState(false);

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
                toast.success(`Switched to ${newMode === 'LANDLORD' ? 'Landlord' : 'Tenant'} mode`);
                router.refresh();
            })
            .catch(() => {
                toast.error('Something went wrong.');
            });
    }, [currentUser, loginModal, router]);

    return (
        <div className="relative">
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
            p-4
            md:py-1
            md:px-2
            border-[1px] 
            border-[#dfdfdf] 
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
                    <div className="hidden md:block">
                        <Avatar src={currentUser?.image} />
                    </div>
                </div>
            </div>
            {isOpen && (
                <div
                    className="
            absolute 
            rounded-xl 
            shadow-md
            w-[40vw]
            md:w-3/4 
            bg-white 
            overflow-hidden 
            right-0 
            top-12 
            text-sm
          "
                >
                    <div className="flex flex-col cursor-pointer">
                        {currentUser ? (
                            <>
                                <MenuItem
                                    onClick={() => router.push('/favorites')}
                                    label="My Wishlists"
                                />
                                {currentUser.userMode === 'LANDLORD' ? (
                                    <>
                                        <MenuItem
                                            onClick={() => router.push('/properties')}
                                            label="My properties"
                                        />
                                        <MenuItem
                                            onClick={rentModal.onOpen}
                                            label="Louer mon bien"
                                        />
                                        <MenuItem
                                            onClick={() => router.push('/dashboard')}
                                            label="Dashboard"
                                        />
                                    </>
                                ) : (
                                    <MenuItem
                                        onClick={() => router.push('/trips')}
                                        label="Ma location"
                                    />
                                )}
                                <hr className="border-[#dfdfdf]" />
                                <MenuItem
                                    onClick={() => router.push('/account/tenant-profile')}
                                    label="My Rental Profile"
                                />
                                <MenuItem
                                    onClick={toggleMode}
                                    label={currentUser.userMode === 'LANDLORD' ? "Switch to Tenant" : "Switch to Landlord"}
                                />
                                <hr />
                                <MenuItem
                                    onClick={() => signOut()}
                                    label="Logout"
                                />
                            </>
                        ) : (
                            <>
                                <MenuItem
                                    label="Login"
                                    onClick={loginModal.onOpen}
                                />
                                <MenuItem
                                    label="Sign up"
                                    onClick={registerModal.onOpen}
                                />
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserMenu;
