'use client';

import { Conversation, User, Listing } from "@prisma/client";
import useOtherUser from "@/hooks/useOtherUser";
import { useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import { HiChevronLeft } from "react-icons/hi";
import Avatar from "@/components/Avatar";
import { HiEllipsisHorizontal, HiInformationCircle } from "react-icons/hi2";
import { useTranslations } from "next-intl";
import DocumentsButton from "@/components/messaging/DocumentsButton";

interface HeaderProps {
    conversation: Conversation & {
        users: User[],
        listing?: Listing | null
    };
    onToggleDossier: () => void;
    onOpenListingRecap?: () => void;
    showDossier?: boolean;
    onToggleDocuments?: () => void;
    conversationId?: string;
    isIdentityRevealed?: boolean;
};

const Header: React.FC<HeaderProps> = ({
    conversation,
    onToggleDossier,
    onOpenListingRecap,
    showDossier,
    onToggleDocuments,
    conversationId,
    isIdentityRevealed,
}) => {
    const t = useTranslations('inbox.header');
    const router = useRouter();
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
        h-[72px]
        px-4
        lg:px-6
        justify-between
        items-center
        relative
        z-10
      ">
                <div className="flex gap-3 items-center">
                    <button
                        onClick={() => router.back()}
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
                    </button>
                    {(() => {
                        const hasPseudonym = !!otherUser?.pseudonymFull;
                        const showPseudo = hasPseudonym && isIdentityRevealed === false;
                        const pseudonymFull = otherUser?.pseudonymFull;
                        const avatarSeed = showPseudo ? pseudonymFull : (otherUser?.email || otherUser?.name);
                        const avatarImage = showPseudo ? null : otherUser?.image;
                        const otherName = showPseudo
                            ? pseudonymFull
                            : otherUser?.name;

                        if (conversation.listing) {
                            return (
                                <>
                                    <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0">
                                        <Avatar src={avatarImage} seed={avatarSeed} size={40} />
                                    </div>
                                    <div className="flex flex-col overflow-hidden">
                                        <div className="text-sm font-semibold text-neutral-800 dark:text-white truncate max-w-[150px] sm:max-w-xs">
                                            {conversation.listing.title}
                                        </div>
                                        <div className="text-sm font-light text-neutral-500 dark:text-neutral-400">
                                            {otherName}
                                        </div>
                                    </div>
                                </>
                            );
                        }
                        return (
                            <>
                                <Avatar src={avatarImage} seed={avatarSeed} size={40} />
                                <div className="flex flex-col">
                                    <div className="text-base font-semibold text-neutral-800 dark:text-white">
                                        {conversation.name || otherName}
                                    </div>
                                    <div className="text-sm font-light text-neutral-500 dark:text-neutral-400">
                                        {statusText}
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div>


                <div className="flex items-center gap-2">
                    {conversationId && onToggleDocuments && (
                        <DocumentsButton
                            conversationId={conversationId}
                            onToggleDocuments={onToggleDocuments}
                        />
                    )}
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
                </div>
            </div >
        </>
    );
}

export default Header;
