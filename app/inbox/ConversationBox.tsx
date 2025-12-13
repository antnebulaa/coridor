'use client';

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import clsx from "clsx";

import { FullConversationType } from "@/types";
import Avatar from "@/components/Avatar";
import useOtherUser from "@/hooks/useOtherUser";

interface ConversationBoxProps {
    data: FullConversationType,
    selected?: boolean;
}

const ConversationBox: React.FC<ConversationBoxProps> = ({
    data,
    selected
}) => {
    const session = useSession();
    const router = useRouter();
    const otherUser = useOtherUser(data);

    const handleClick = useCallback(() => {
        router.push(`/inbox/${data.id}`);
    }, [data.id, router]);

    const lastMessage = useMemo(() => {
        const messages = data.messages || [];
        return messages[messages.length - 1];
    }, [data.messages]);

    const userEmail = useMemo(() => {
        return session.data?.user?.email;
    }, [session.data?.user?.email]);

    const hasSeen = useMemo(() => {
        if (!lastMessage) {
            return false;
        }

        const seenArray = lastMessage.seen || [];

        if (!userEmail) {
            return false;
        }

        return seenArray.filter((user) => user.email === userEmail).length !== 0;
    }, [userEmail, lastMessage]);

    const lastMessageText = useMemo(() => {
        if (lastMessage?.image) {
            return 'Sent an image';
        }

        if (lastMessage?.body) {
            return lastMessage.body;
        }

        return 'New conversation';
        return 'New conversation';
    }, [lastMessage]);

    // Application Status Logic
    const { applicationStatus, applicationColor, applicationLabel } = useMemo(() => {
        // 1. Find the listing ID discussed in this conversation
        const listingId = data.messages.find(m => m.listingId)?.listingId;

        if (!listingId) {
            return { applicationStatus: null, applicationColor: null, applicationLabel: null };
        }

        // 2. Find if there is an application for this listing from the users in the conversation
        // We look through all users' scopes
        let application = null;

        for (const user of data.users) {
            // Check created scopes
            if (user.createdScopes) {
                for (const scope of user.createdScopes) {
                    if (scope.applications) {
                        const app = scope.applications.find(a => a.propertyId === listingId);
                        if (app) {
                            application = app;
                            break;
                        }
                    }
                }
            }
            if (application) break;
        }

        if (!application) {
            return { applicationStatus: null, applicationColor: null, applicationLabel: null };
        }

        // 3. Determine label and color
        let color = 'bg-gray-400';
        let label = 'En attente';

        switch (application.status) {
            case 'SENT':
                color = 'bg-blue-500';
                label = 'Candidature envoyée';
                break;
            case 'REJECTED':
                color = 'bg-red-500';
                label = 'Candidature rejetée';
                break;
            case 'VISIT_PROPOSED':
                color = 'bg-purple-500';
                label = 'Proposition de visite';
                break;
            case 'VISIT_CONFIRMED':
                color = 'bg-indigo-500';
                label = 'Visite programmée';
                break;
            case 'ACCEPTED':
                color = 'bg-green-500';
                label = 'Dossier accepté';
                break;
            case 'PENDING':
            default:
                color = 'bg-yellow-500';
                label = 'En attente';
                break;
        }

        return {
            applicationStatus: application.status,
            applicationColor: color,
            applicationLabel: label
        };

    }, [data.messages, data.users]);

    return (
        <div
            onClick={handleClick}
            className={clsx(`
        w-full 
        relative 
        flex 
        items-center 
        space-x-3 
        hover:bg-secondary 
        rounded-lg 
        transition
        cursor-pointer
        p-3
      `,
                selected ? 'bg-secondary' : 'bg-background'
            )}
        >
            <Avatar src={otherUser?.image} seed={otherUser?.email || otherUser?.name} />
            <div className="min-w-0 flex-1">
                <div className="focus:outline-none">
                    <div className="flex justify-between items-center">
                        <p className="text-md font-medium text-foreground">
                            {data.name || otherUser?.name || 'Unknown User'}
                        </p>
                        {lastMessage?.createdAt && (
                            <p className="text-xs text-muted-foreground font-light">
                                {format(new Date(lastMessage.createdAt), 'p')}
                            </p>
                        )}
                    </div>
                    <p className={clsx(`
            truncate 
            text-sm
          `,
                        hasSeen ? 'text-muted-foreground' : 'text-foreground font-medium'
                    )}>
                        {lastMessageText}
                    </p>
                    {applicationStatus && (
                        <div className="flex items-center gap-2 mt-1">
                            <div className={clsx("w-2 h-2 rounded-full", applicationColor)}></div>
                            <div className="text-xs text-muted-foreground font-medium">{applicationLabel}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ConversationBox;
