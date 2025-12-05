import { Listing, Reservation, User, Room, PropertyImage, TenantProfile, UserMode, Conversation, Message, Wishlist } from "@prisma/client";

export type SafeListing = Omit<
    Listing,
    "createdAt"
> & {
    createdAt: string;
    images: PropertyImage[];
    rooms?: (Room & { images: PropertyImage[] })[];
    isFurnished: boolean;
    surface: number | null;
    surfaceUnit: string | null;
    kitchenType: string | null;
    floor: number | null;
    totalFloors: number | null;
    buildYear: number | null;
    city: string | null;
    district: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
    // New Amenities
    hasElevator: boolean;
    isAccessible: boolean;
    hasAutomaticDoors: boolean;
    isLastFloor: boolean;
    isBright: boolean;
    hasNoOpposite: boolean;
    hasView: boolean;
    isQuiet: boolean;
    hasPool: boolean;
    hasBathtub: boolean;
    hasAirConditioning: boolean;
    isStudentFriendly: boolean;
    hasConcierge: boolean;
    // Existing Amenities
    isTraversant: boolean;
    hasGarden: boolean;
    isRefurbished: boolean;
    petsAllowed: boolean;
    isKitchenEquipped: boolean;
    isSouthFacing: boolean;
    hasStorage: boolean;
    hasFiber: boolean;
    hasBikeRoom: boolean;
    hasLaundry: boolean;
    isNearTransport: boolean;
    hasDigicode: boolean;
    hasIntercom: boolean;
    hasCaretaker: boolean;
    hasArmoredDoor: boolean;
    isQuietArea: boolean;
    isNearGreenSpace: boolean;
    isNearSchools: boolean;
    isNearShops: boolean;
    isNearHospital: boolean;
};

export type SafeReservation = Omit<
    Reservation,
    "createdAt" | "startDate" | "endDate" | "listing"
> & {
    createdAt: string;
    startDate: string;
    endDate: string;
    listing: SafeListing;
    user: SafeUser;
};

export type SafeWishlist = Omit<
    Wishlist,
    "createdAt"
> & {
    createdAt: string;
    listings: { id: string }[];
};

export type SafeUser = Omit<
    User,
    "createdAt" | "updatedAt" | "emailVerified" | "birthDate"
> & {
    createdAt: string;
    updatedAt: string;
    emailVerified: string | null;
    userMode: UserMode;
    phoneNumber: string | null;
    birthDate: string | null;
    tenantProfile: TenantProfile | null;
    wishlists: SafeWishlist[] | null;
    measurementSystem: string | null;
};

export type FullMessageType = Message & {
    sender: User,
    seen: User[],
    listing?: Listing | null,
    listingId?: string | null
};

export type FullConversationType = Conversation & {
    users: User[],
    messages: FullMessageType[]
};

export type SafeMessage = Omit<
    Message,
    "createdAt"
> & {
    createdAt: string;
    sender: SafeUser;
    seen: SafeUser[];
    listing?: SafeListing | null;
    listingId?: string | null;
};
