import prisma from "@/libs/prismadb";
import getConversationById from "@/app/actions/getConversationById";
import getMessages from "@/app/actions/getMessages";
import getCurrentUser from "@/app/actions/getCurrentUser";
import EmptyState from "@/components/EmptyState";
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

        const propertyImages = listing.rentalUnit?.property?.images || [];
        const unitImages = listing.rentalUnit?.images || [];

        // Prioritize unit images (specific) over property images (common)
        let aggregatedImages = [...unitImages, ...propertyImages];

        safeListing = {
            ...listing,
            images: aggregatedImages,
            city: listing.rentalUnit?.property?.city || null,
            createdAt: listing.createdAt.toISOString(),
            statusUpdatedAt: listing.statusUpdatedAt ? listing.statusUpdatedAt.toISOString() : new Date().toISOString(),
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
    if (safeListing && otherUser) {
        // We need to find the application linking this user (via scope) and this property
        const application = await prisma.rentalApplication.findFirst({
            where: {
                listingId: safeListing.id,
                candidateScope: {
                    creatorUserId: otherUser.id
                }
            },
            select: { id: true }
        });
        applicationId = application?.id || null;
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
            />
        </div>
    );
}

export default ConversationId;
