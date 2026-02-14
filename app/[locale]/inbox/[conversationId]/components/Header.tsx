'use client';

import { Conversation, User, Listing } from "@prisma/client";
import useOtherUser from "@/hooks/useOtherUser";
import { useMemo } from "react";
import Link from "next/link";
import { HiChevronLeft } from "react-icons/hi";
import Avatar from "@/components/Avatar";
import { HiEllipsisHorizontal, HiInformationCircle } from "react-icons/hi2";
import { useTranslations } from "next-intl";

interface HeaderProps {
    conversation: Conversation & {
        users: User[],
        listing?: Listing | null
    };
    onToggleDossier: () => void;
    onOpenListingRecap?: () => void;
    showDossier?: boolean;
};

const Header: React.FC<HeaderProps> = ({
    conversation,
    onToggleDossier,
    onOpenListingRecap,
    showDossier
}) => {
    const t = useTranslations('inbox.header');
    const otherUser = useOtherUser(conversation);

    const statusText = useMemo(() => {
        if (conversation.isGroup) {
            return t('members', { count: conversation.users.length });
        }

        return '';
    }, [conversation, t]);

    return (
        <>
            <div className="
        bg-white dark:bg-neutral-900
        w-full
        flex
        border-b
        border-gray-200 dark:border-neutral-800
        sm:px-4
        pt-safe
        pb-3
        px-4
        lg:px-6
        justify-between
        items-center
        relative
        z-10
        min-h-[73px]
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
                    {conversation.listing ? (
                        <>
                            <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0">
                                {/* Ideally we use Image component or Avatar with listing image */}
                                <Avatar src={otherUser?.image} seed={otherUser?.email || otherUser?.name} size={40} />
                                {/* Actually let's just stick to user avatar for now but change title */}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <div className="text-sm font-semibold text-neutral-800 dark:text-white truncate max-w-[150px] sm:max-w-xs">
                                    {conversation.listing.title}
                                </div>
                                <div className="text-sm font-light text-neutral-500 dark:text-neutral-400">
                                    {otherUser?.name}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <Avatar src={otherUser?.image} seed={otherUser?.email || otherUser?.name} size={40} />
                            <div className="flex flex-col">
                                <div className="text-base font-semibold text-neutral-800 dark:text-white">
                                    {conversation.name || otherUser?.name}
                                </div>
                                <div className="text-sm font-light text-neutral-500 dark:text-neutral-400">
                                    {statusText}
                                </div>
                            </div>
                        </>
                    )}
                </div>


                <div
                    onClick={showDossier ? onToggleDossier : onOpenListingRecap}
                    className="
                        py-1.5
                        px-3
                        bg-neutral-100 dark:bg-neutral-800 
                        hover:bg-neutral-200 dark:hover:bg-neutral-700
                        rounded-full 
                        cursor-pointer 
                        transition
                        xl:hidden
                        flex
                        items-center
                        justify-center
                    "
                >
                    <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        {showDossier ? t('viewDossier') : t('viewRecap')}
                    </span>
                </div>
            </div >
        </>
    );
}

export default Header;
