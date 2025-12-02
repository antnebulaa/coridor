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
    }
};

const Header: React.FC<HeaderProps> = ({
    conversation
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
        bg-white 
        w-full 
        flex 
        border-b-[1px] 
        sm:px-4 
        py-3 
        px-4 
        lg:px-6 
        justify-between 
        items-center 
        shadow-sm
      ">
                <div className="flex gap-3 items-center">
                    <Link
                        href="/inbox"
                        className="
              lg:hidden 
              block 
              text-rose-500 
              hover:text-rose-600 
              transition 
              cursor-pointer
            "
                    >
                        <HiChevronLeft size={32} />
                    </Link>
                    <Avatar src={otherUser?.image} seed={otherUser?.email || otherUser?.name} />
                    <div className="flex flex-col">
                        <div>
                            {conversation.name || otherUser?.name}
                        </div>
                        <div className="text-sm font-light text-neutral-500">
                            {statusText}
                        </div>
                    </div>
                </div>
                <HiEllipsisHorizontal
                    size={32}
                    onClick={() => { }}
                    className="
            text-rose-500
            cursor-pointer
            hover:text-rose-600
            transition
          "
                />
            </div>
        </>
    );
}

export default Header;
