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
    const [conversation, messagesResult, currentUser] = await Promise.all([
        getConversationById(params.conversationId),
        getMessages({ conversationId: params.conversationId }),
        getCurrentUser(),
    ]);
    const messages = messagesResult.messages as FullMessageType[];
    const hasMoreMessages = messagesResult.hasMore;
    const nextMessageCursor = messagesResult.nextCursor;
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
        // Fetch application + visit in parallel
        const [application, visit] = await Promise.all([
            prisma.rentalApplication.findFirst({
                where: {
                    listingId: safeListing.id,
                    candidateScope: {
                        creatorUserId: { in: [otherUser.id, currentUser.id] }
                    }
                },
                select: { id: true, status: true, rejectionReason: true, leaseStatus: true }
            }),
            prisma.visit.findFirst({
                where: {
                    listingId: safeListing.id,
                    candidateId: {
                        in: [otherUser.id, currentUser?.id].filter(Boolean) as string[]
                    },
                    status: 'CONFIRMED'
                },
                orderBy: { createdAt: 'desc' }
            }),
        ]);

        applicationId = application?.id || null;
        applicationStatus = application?.status || null;
        applicationRejectionReason = application?.rejectionReason || null;
        leaseStatus = application?.leaseStatus || null;

        if (visit) {
            confirmedVisit = {
                id: visit.id,
                date: visit.date.toISOString(),
                startTime: visit.startTime,
                endTime: visit.endTime
            };
        }
    }

    // Fetch inspection data if lease is signed (ENTRY + EXIT separately)
    let inspectionData: { id: string; status: string; type: string; pdfUrl: string | null; scheduledAt: string | null } | null = null;
    let exitInspectionData: { id: string; status: string; type: string; pdfUrl: string | null; scheduledAt: string | null } | null = null;
    if (applicationId && leaseStatus === 'SIGNED') {
        const inspections = await prisma.inspection.findMany({
            where: { applicationId },
            select: { id: true, status: true, type: true, pdfUrl: true, scheduledAt: true },
            orderBy: { createdAt: 'desc' },
        });
        const entryInspection = inspections.find(i => i.type === 'ENTRY') || null;
        const exitInspection = inspections.find(i => i.type === 'EXIT') || null;
        if (entryInspection) {
            inspectionData = {
                id: entryInspection.id,
                status: entryInspection.status,
                type: entryInspection.type,
                pdfUrl: entryInspection.pdfUrl,
                scheduledAt: entryInspection.scheduledAt?.toISOString() || null,
            };
        }
        if (exitInspection) {
            exitInspectionData = {
                id: exitInspection.id,
                status: exitInspection.status,
                type: exitInspection.type,
                pdfUrl: exitInspection.pdfUrl,
                scheduledAt: exitInspection.scheduledAt?.toISOString() || null,
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
                inspectionData={inspectionData}
                exitInspectionData={exitInspectionData}
                hasMoreMessages={hasMoreMessages}
                nextMessageCursor={nextMessageCursor}
            />
        </div>
    );
}

export default ConversationId;
