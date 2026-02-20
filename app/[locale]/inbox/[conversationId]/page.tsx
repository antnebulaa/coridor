import prisma from "@/libs/prismadb";
import getConversationById from "@/app/actions/getConversationById";
import getMessages from "@/app/actions/getMessages";
import getCurrentUser from "@/app/actions/getCurrentUser";
import EmptyState from "@/components/EmptyState";
import { redirect } from 'next/navigation';
import { SafeUser, FullMessageType, SafeListing } from "@/types";
import ConversationClient from "./ConversationClient";

interface IParams {
    conversationId: string;
}

const ConversationId = async (props: { params: Promise<IParams> }) => {
    const params = await props.params;
    const conversation = await getConversationById(params.conversationId);
    const messages = await getMessages(params.conversationId) as FullMessageType[];
    const currentUser = await getCurrentUser();
    if (!currentUser) { redirect('/'); }

    if (!conversation) {
        return (
            <div className="lg:pl-80 h-full">
                <div className="h-full flex flex-col">
                    <EmptyState />
                </div>
            </div>
        );
    }

    // Find other user using ID comparison for safety
    const otherUser = conversation.users.find((user: any) => user.id !== currentUser?.id);

    // Extract listing directly from conversation relation (added in getConversationById)
    const listing = (conversation as any).listing;

    let safeListing = null;
    let rent = undefined;
    let listingUserId = undefined;

    if (listing) {
        rent = listing.price;
        listingUserId = listing.rentalUnit?.property?.ownerId;
        const owner = listing.rentalUnit?.property?.owner;

        const propertyImagesRaw = listing.rentalUnit?.property?.images || [];
        const unitImages = listing.rentalUnit?.images || [];
        const targetRoomImages = listing.rentalUnit?.targetRoom?.images || [];

        const targetRoomId = listing.rentalUnit?.targetRoom?.id;

        const propertyImages = propertyImagesRaw.filter((img: any) => {
            if (!img.roomId) return true;
            if (img.roomId === targetRoomId) return true;
            return img.room && !img.room.name.toLowerCase().startsWith('chambre');
        });

        const rooms = listing.rentalUnit?.property?.rooms || [];
        const roomsImages = rooms.flatMap((room: any) => {
            if (room.id !== targetRoomId && room.name.toLowerCase().startsWith('chambre')) {
                return [];
            }
            return room.images || [];
        });

        const allImages = [...unitImages, ...targetRoomImages, ...propertyImages, ...roomsImages];
        const uniqueUrls = new Set();
        const aggregatedImages = allImages.filter((img: any) => {
            if (uniqueUrls.has(img.url)) return false;
            uniqueUrls.add(img.url);
            return true;
        });

        safeListing = {
            ...listing,
            ...listing,
            images: aggregatedImages,
            city: listing.rentalUnit?.property?.city || null,
            addressLine1: listing.rentalUnit?.property?.addressLine1 || null,
            zipCode: listing.rentalUnit?.property?.zipCode || null,

            surface: listing.rentalUnit?.surface || null,
            category: listing.rentalUnit?.property?.category || "Logement",

            charges: listing.charges,
            createdAt: listing.createdAt.toISOString(),
            statusUpdatedAt: listing.statusUpdatedAt ? listing.statusUpdatedAt.toISOString() : new Date().toISOString(),
            visitSlots: (listing.rentalUnit?.property?.visitSlots || []).map((slot: any) => ({
                ...slot,
                date: slot.date.toISOString(),
                createdAt: slot.createdAt?.toISOString(),
                updatedAt: slot.updatedAt?.toISOString()
            })),
            user: owner ? {
                ...owner,
                createdAt: owner.createdAt.toISOString(),
                updatedAt: owner.updatedAt.toISOString(),
                emailVerified: owner.emailVerified?.toISOString() || null,
                birthDate: null, // Basic fields only
                tenantProfile: null,
                wishlists: null,
                commuteLocations: null
            } : null // Handle if owner is somehow missing
        } as SafeListing;
    }

    const hasTenantProfile = !!otherUser?.tenantProfile;

    // Extract scope
    const latestScope = (otherUser as any)?.createdScopes?.[0] || null;
    const safeScope = latestScope ? {
        ...latestScope,
        createdAt: latestScope.createdAt.toISOString(),
        targetMoveInDate: latestScope.targetMoveInDate?.toISOString() || null
    } : null;

    // Show dossier ONLY if current user is the owner of the listing
    const isListingOwner = currentUser?.id === listingUserId;
    const showDossier = !!(hasTenantProfile && isListingOwner);

    const safeOtherUser = otherUser ? {
        ...otherUser,
        createdAt: otherUser.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: otherUser.updatedAt?.toISOString() || new Date().toISOString(),
        emailVerified: otherUser.emailVerified?.toISOString() || null,
        birthDate: otherUser.birthDate?.toISOString() || null,
        tenantProfile: otherUser.tenantProfile ? {
            ...otherUser.tenantProfile,
            createdAt: (otherUser.tenantProfile as any).createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: (otherUser.tenantProfile as any).updatedAt?.toISOString() || new Date().toISOString(),
            guarantors: (otherUser.tenantProfile as any).guarantors,
            additionalIncomes: (otherUser.tenantProfile as any).additionalIncomes
        } : null,
        wishlists: null,
        commuteLocations: null
    } as SafeUser : null;

    const safeMessages = messages.map((message) => ({
        ...message,
        createdAt: message.createdAt?.toISOString() || new Date().toISOString(),
        sender: {
            ...message.sender,
            createdAt: message.sender?.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: message.sender?.updatedAt?.toISOString() || new Date().toISOString(),
            emailVerified: message.sender?.emailVerified?.toISOString() || null,
            birthDate: message.sender?.birthDate?.toISOString() || null,
            tenantProfile: null,
            wishlists: null,
            commuteLocations: null
        },
        seen: (message.seen || []).map((user) => ({
            ...user,
            createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: user.updatedAt?.toISOString() || new Date().toISOString(),
            emailVerified: user.emailVerified?.toISOString() || null,
            birthDate: user.birthDate?.toISOString() || null,
            tenantProfile: null,
            wishlists: null,
            commuteLocations: null
        })),
        listing: message.listingId === listing?.id ? safeListing : null
    }));

    // Fetch Status and Application ID
    let applicationId = null;
    let applicationStatus: string | null = null;
    let applicationRejectionReason: string | null = null;
    let leaseStatus: string | null = null;
    let confirmedVisit = null;

    if (safeListing && otherUser && currentUser) {
        // Find the application for this listing — scope could be from either participant
        const application = await prisma.rentalApplication.findFirst({
            where: {
                listingId: safeListing.id,
                candidateScope: {
                    creatorUserId: { in: [otherUser.id, currentUser.id] }
                }
            },
            select: { id: true, status: true, rejectionReason: true, leaseStatus: true }
        });
        applicationId = application?.id || null;
        applicationStatus = application?.status || null;
        applicationRejectionReason = application?.rejectionReason || null;
        leaseStatus = application?.leaseStatus || null;

        // Fetch valid visit (confirmed)
        // We check if EITHER the current user OR the other user is the candidate for this listing.
        // This covers both Candidate View (viewing their own visit) and Landlord View (viewing candidate's visit).
        const visit = await prisma.visit.findFirst({
            where: {
                listingId: safeListing.id,
                candidateId: {
                    in: [otherUser.id, currentUser?.id].filter(Boolean) as string[]
                },
                status: 'CONFIRMED'
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (visit) {
            confirmedVisit = {
                id: visit.id,
                date: visit.date.toISOString(),
                startTime: visit.startTime,
                endTime: visit.endTime
            };
        }
    }

    return (
        <div className="h-full">
            <ConversationClient
                conversation={conversation}
                currentUser={currentUser}
                initialMessages={safeMessages}
                rent={rent}
                otherUser={safeOtherUser}
                showDossier={showDossier}
                listing={safeListing}
                candidateScope={safeScope}
                applicationId={applicationId}
                applicationStatus={applicationStatus}
                applicationRejectionReason={applicationRejectionReason}
                leaseStatus={leaseStatus}
                conversationId={conversation.id}
                confirmedVisit={confirmedVisit}
            />
        </div>
    );
}

export default ConversationId;
