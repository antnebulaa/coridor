'use client';

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import clsx from "clsx";
import { useTranslations } from "next-intl";

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
    const t = useTranslations('inbox.conversation');
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
            return t('sentImage');
        }

        if (lastMessage?.body) {
            // Translate system messages
            if (lastMessage.body === 'LEASE_SENT_FOR_SIGNATURE') return 'Bail envoyé pour signature';
            if (lastMessage.body === 'INVITATION_VISITE') return 'Invitation à une visite';
            if (lastMessage.body.startsWith('VISIT_CONFIRMED|')) return 'Visite confirmée';
            if (lastMessage.body.startsWith('APPLICATION_REJECTED|')) return 'Candidature déclinée';
            if (lastMessage.body.startsWith('INSPECTION_SCHEDULED|')) return "🗓️ État des lieux planifié";
            if (lastMessage.body.startsWith('INSPECTION_CONFIRMED|')) return "✅ Créneau EDL confirmé";
            if (lastMessage.body.startsWith('INSPECTION_REMINDER|')) return "🔔 Rappel état des lieux";
            if (lastMessage.body.startsWith('INSPECTION_STARTED|')) return "🏠 État des lieux démarré";
            if (lastMessage.body.startsWith('INSPECTION_COMPLETED|')) return '✍️ Bailleur a signé';
            if (lastMessage.body.startsWith('INSPECTION_SIGNED|')) return '✅ État des lieux signé';
            if (lastMessage.body.startsWith('INSPECTION_SIGN_LINK_SENT|')) return '✉️ Lien de signature envoyé';
            if (lastMessage.body.startsWith('INSPECTION_PDF_READY|')) return '📄 PDF disponible';
            if (lastMessage.body.startsWith('INSPECTION_CANCELLED|')) return '❌ État des lieux annulé';
            if (lastMessage.body.startsWith('INSPECTION_RESCHEDULED|')) return '🔄 EDL reprogrammé';
            if (lastMessage.body.startsWith('INSPECTION_AMENDMENT_REQUESTED|')) return '⚠️ Rectification demandée';
            if (lastMessage.body.startsWith('INSPECTION_AMENDMENT_RESPONDED|')) {
                const status = lastMessage.body.split('|')[3];
                return status === 'ACCEPTED' ? '✅ Rectification acceptée' : '❌ Rectification refusée';
            }
            return lastMessage.body;
        }

        return t('new');
    }, [lastMessage, t]);

    // Application Status Logic
    const { applicationStatus, applicationColor, applicationLabel } = useMemo(() => {
        // 1. Find the listing ID discussed in this conversation
        const listingId = data.listingId || data.messages.find(m => m.listingId)?.listingId;

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
                        const app = scope.applications.find(a => a.listingId === listingId);
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

        // 3. Determine label and color — lease status takes priority
        let color = 'bg-gray-400';
        let label = t('status.pending');

        // Check EDL status (highest priority — derived from system messages)
        const messages = data.messages || [];
        const hasEdlSigned = messages.some(m => m.body?.startsWith('INSPECTION_SIGNED|') || m.body?.startsWith('INSPECTION_PDF_READY|'));
        const hasEdlStarted = messages.some(m => m.body?.startsWith('INSPECTION_STARTED|'));
        const hasEdlScheduled = messages.some(m => m.body?.startsWith('INSPECTION_SCHEDULED|'));

        if (hasEdlSigned) {
            color = 'bg-green-500';
            label = 'EDL signé';
        } else if (hasEdlStarted) {
            color = 'bg-amber-500';
            label = 'EDL en cours';
        } else if (hasEdlScheduled) {
            color = 'bg-amber-400';
            label = 'EDL planifié';
        } else if (application.leaseStatus === 'SIGNED') {
            color = 'bg-green-500';
            label = 'Bail signé';
        } else if (application.leaseStatus === 'PENDING_SIGNATURE') {
            color = 'bg-blue-500';
            label = 'Bail en signature';
        } else {
            switch (application.status) {
                case 'SENT':
                    color = 'bg-blue-500';
                    label = t('status.sent');
                    break;
                case 'REJECTED':
                    color = 'bg-red-500';
                    label = t('status.rejected');
                    break;
                case 'VISIT_PROPOSED':
                    color = 'bg-purple-500';
                    label = t('status.visitProposed');
                    break;
                case 'VISIT_CONFIRMED':
                    color = 'bg-indigo-500';
                    label = t('status.visitConfirmed');
                    break;
                case 'SELECTED':
                    color = 'bg-green-500';
                    label = 'Candidature retenue';
                    break;
                case 'SHORTLISTED':
                    color = 'bg-emerald-500';
                    label = 'Présélectionné';
                    break;
                case 'FINALIST':
                    color = 'bg-emerald-500';
                    label = 'Finaliste';
                    break;
                case 'ACCEPTED':
                    color = 'bg-green-500';
                    label = t('status.accepted');
                    break;
                case 'PENDING':
                default:
                    color = 'bg-yellow-500';
                    label = t('status.pending');
                    break;
            }
        }

        return {
            applicationStatus: application.status,
            applicationColor: color,
            applicationLabel: label
        };

    }, [data.messages, data.users, t]);

    // AVATAR LOGIC
    const avatarSrc = useMemo(() => {
        // If no listing (Support), use User Avatar based on otherUser
        if (!data.listing) {
            return otherUser?.image;
        }

        const listing = data.listing as any;
        const ownerId = listing?.rentalUnit?.property?.owner?.id;

        if (otherUser?.id === ownerId) {
            // otherUser is the Owner. I am the Candidate. Show Listing Image.
            const mainImage = listing.images?.[0]?.url;
            return mainImage || otherUser?.image; // Fallback to avatar if no image
        } else {
            // otherUser is NOT the Owner (so otherUser is Candidate). I am the Owner.
            // As an owner, I want to see the Candidate's Avatar.
            return otherUser?.image;
        }

    }, [data.listing, otherUser]);

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
            <Avatar src={avatarSrc} seed={otherUser?.email || otherUser?.name} size={52} />
            <div className="min-w-0 flex-1">
                <div className="focus:outline-none flex flex-col gap-px">
                    <div className="flex justify-between items-center mb-0">
                        <p className={clsx(`
                            text-base 
                            leading-tight
                            truncate
                            text-foreground
                        `,
                            hasSeen ? 'font-normal' : 'font-medium'
                        )}>
                            {(() => {
                                // Title Logic: Always return Other User Name formatted first
                                if (otherUser?.name) {
                                    const names = otherUser.name.split(' ');
                                    if (names.length > 1) {
                                        return `${names[0]} ${names[names.length - 1][0] ?? ''}.`;
                                    }
                                    return names[0];
                                }

                                // Fallback
                                const l = data.listing as any;
                                if (l?.category && l?.propertyAdjective) {
                                    return `${l.category} ${l.propertyAdjective}`;
                                }
                                return l?.title || data.name || t('unknownUser');
                            })()}
                        </p>
                        {lastMessage?.createdAt && (
                            <p className="text-sm text-muted-foreground font-normal leading-tight">
                                {format(new Date(lastMessage.createdAt), 'p')}
                            </p>
                        )}
                    </div>
                    <p className={clsx(`
            truncate 
            text-base
            leading-tight
          `,
                        hasSeen ? 'text-muted-foreground' : 'text-foreground font-medium'
                    )}>
                        {lastMessageText}
                    </p>
                    {applicationStatus && (
                        <div className="flex items-center gap-2 mt-0">
                            <div className={clsx("w-2 h-2 rounded-full", applicationColor)}></div>
                            <div className="text-sm text-muted-foreground font-medium leading-tight">{applicationLabel}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ConversationBox;
