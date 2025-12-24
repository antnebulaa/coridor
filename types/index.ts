import { Listing, Reservation, User, Room, PropertyImage, TenantProfile, UserMode, Conversation, Message, Wishlist, Plan, RentalApplication, TenantCandidateScope, ApplicationStatus, CommuteLocation } from "@prisma/client";

export type SafePropertyImage = PropertyImage;

export type SafeRoom = Omit<
    Room,
    "images"
> & {
    images: SafePropertyImage[];
};

export type SafeListing = Omit<
    Listing,
    "createdAt" | "statusUpdatedAt"
> & {
    createdAt: string;
    statusUpdatedAt: string;
    isPublished: boolean;
    images: SafePropertyImage[];
    rooms?: SafeRoom[];
    isFurnished: boolean;
    surface: number | null;
    surfaceUnit: string | null;
    kitchenType: string | null;
    floor: number | null;
    totalFloors: number | null;
    dpe?: string | null;
    energy_cost_min?: number | null;
    energy_cost_max?: number | null;
    dpe_year?: number | null;
    ges?: string | null;
    heatingSystem?: string | null;
    glazingType?: string | null;
    charges?: any;
    securityDeposit?: number | null;
    buildYear: number | null;
    city: string | null;
    district: string | null;
    neighborhood: string | null;
    country: string | null;
    addressLine1: string | null;
    building: string | null;
    apartment: string | null;
    zipCode: string | null;
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
    isNearHospital: boolean;
    transitData?: any;
    propertyAdjective?: string | null;
    visitSlots?: any[];
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
    plan: Plan;
    firstName: string | null;
    lastName: string | null;
    addressLine1: string | null;
    building: string | null;
    apartment: string | null;
    zipCode: string | null;
    city: string | null;
    country: string | null;
    phoneNumber: string | null;
    birthDate: string | null;
    birthPlace: string | null;
    tenantProfile: TenantProfile | null;
    wishlists: SafeWishlist[] | null;
    measurementSystem: string | null;
    commuteLocations: SafeCommuteLocation[] | null;
};

export type SafeCommuteLocation = Omit<
    CommuteLocation,
    "createdAt" | "updatedAt"
> & {
    createdAt: string;
    updatedAt: string;
    isShowOnMap: boolean;
};

export type FullMessageType = Message & {
    sender: User,
    seen: User[],
    listing?: Listing | null
};

export type FullConversationType = Conversation & {
    users: (User & {
        createdScopes: (TenantCandidateScope & {
            applications: RentalApplication[]
        })[]
    })[],
    messages: FullMessageType[],
    listing?: Listing | null
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
