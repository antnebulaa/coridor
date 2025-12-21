'use client';

import { Conversation, User } from "@prisma/client";
import useOtherUser from "@/hooks/useOtherUser";
import { useMemo } from "react";
import Link from "next/link";
import { HiChevronLeft } from "react-icons/hi";
import Avatar from "@/components/Avatar";
import { HiEllipsisHorizontal } from "react-icons/hi2";

interface HeaderProps {
    conversation: Conversation & {
        users: User[]
    };
    onToggleDossier: () => void;
};

const Header: React.FC<HeaderProps> = ({
    conversation,
    onToggleDossier
}) => {
    const otherUser = useOtherUser(conversation);

    const statusText = useMemo(() => {
        if (conversation.isGroup) {
            return `${conversation.users.length} members`;
        }

        return '';
    }, [conversation]);

    return (
        <>
            <div className="
        bg-white dark:bg-neutral-900
        w-full 
        flex 
        border-b 
        border-gray-200 dark:border-neutral-800
        sm:px-4 
        py-3 
        px-4 
        lg:px-6 
        justify-between 
        items-center 
        relative
        z-10
      ">
                <div className="flex gap-3 items-center">
                    <Link
                        href="/inbox"
                        className="
              lg:hidden 
              block 
              text-primary 
              hover:text-primary-hover 
              transition 
              cursor-pointer
            "
                    >
                        <HiChevronLeft size={32} />
                    </Link>
                    <Avatar src={otherUser?.image} seed={otherUser?.email || otherUser?.name} size={48} />
                    <div className="flex flex-col">
                        <div className="text-2xl font-medium text-neutral-800 dark:text-white">
                            {conversation.name || otherUser?.name}
                        </div>
                        <div className="text-sm font-light text-neutral-500 dark:text-neutral-400">
                            {statusText}
                        </div>
                    </div>
                </div>

            </div>
        </>
    );
}

export default Header;
