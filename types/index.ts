import {
    Listing,
    Reservation,
    User,
    Room,
    PropertyImage,
    TenantProfile,
    UserMode,
    Conversation,
    Message,
    Wishlist,
    Plan,
    RentalApplication,
    TenantCandidateScope,
    ApplicationStatus,
    CommuteLocation,
    Property,
    RentalUnit,
    VisitSlot,
    Visit,
    RentalUnitType,
    Expense
} from "@prisma/client";

export type SafePropertyImage = PropertyImage;

export type SafeRoom = Omit<Room, "images"> & {
    images: SafePropertyImage[];
};

export type SafeVisitSlot = Omit<VisitSlot, "date"> & {
    date: string;
};

export type SafeExpense = Omit<Expense, "dateOccurred"> & {
    dateOccurred: string;
};

// 1. SafeProperty (The Physical Asset)
export type SafeProperty = Omit<
    Property,
    "createdAt" | "updatedAt"
> & {
    createdAt: string;
    updatedAt: string;
    owner: SafeUser;
    images: SafePropertyImage[];
    rooms: SafeRoom[];
    visitSlots?: SafeVisitSlot[];
    rentalUnits: SafeRentalUnit[];
    lat?: number | null;
    lng?: number | null;
    expenses?: SafeExpense[];
};

// 2. SafeRentalUnit (The Logical Unit)
export type SafeRentalUnit = Omit<RentalUnit, "id"> & {
    id: string; // Keep ID
    type: RentalUnitType; // Ensure type is explicitly included
    property: SafeProperty;
    images: SafePropertyImage[];
    targetRoom?: SafeRoom | null;
    listings: SafeListing[];
};

// 3. SafeListing (The Commercial Offer - Enriched for UI Facade)
export type SafeListing = Omit<
    Listing,
    "createdAt" | "updatedAt" | "statusUpdatedAt" | "availableFrom"
> & {
    createdAt: string;
    updatedAt: string;
    statusUpdatedAt: string;
    availableFrom: string | null;
    activeApplications?: any[];

    rentalUnit: SafeRentalUnit;

    visitSlots?: SafeVisitSlot[];
    user?: SafeUser;

    // Facade / Flattened Fields for UI Compatibility
    city: string | null;
    country: string | null;
    district: string | null;
    neighborhood: string | null;
    addressLine1: string | null;
    building: string | null;
    apartment: string | null;
    zipCode: string | null;
    latitude: number | null;
    longitude: number | null;

    category: string;

    surface: number | null;
    surfaceUnit: string | null;
    floor: number | null;
    totalFloors: number | null;
    isFurnished: boolean;
    buildYear: number | null;

    // Amenities (Union of Property + Unit + Listing specific)
    hasElevator: boolean;
    isAccessible: boolean;
    hasFiber: boolean;
    hasBikeRoom: boolean;
    hasPool: boolean;
    transitData?: any;
    images: SafePropertyImage[];

    // Add back all booleans used in UI
    isTraversant: boolean;
    hasGarden: boolean;
    isRefurbished: boolean;
    petsAllowed: boolean;
    isKitchenEquipped: boolean;
    isSouthFacing: boolean;
    hasStorage: boolean;
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

    // New Amenities from older update
    hasAutomaticDoors: boolean;
    isLastFloor: boolean;
    isBright: boolean;
    hasNoOpposite: boolean;
    hasView: boolean;
    isQuiet: boolean;
    hasBathtub: boolean;
    hasAirConditioning: boolean;
    isStudentFriendly: boolean;
    hasConcierge: boolean;

    // Missing Fields for UI
    rentalUnitType?: 'ENTIRE_PLACE' | 'PRIVATE_ROOM' | 'SHARED_ROOM'; // or RentalUnitType
    kitchenType?: string;
    heatingSystem?: string;
    glazingType?: string;
    dpe?: string;
    ges?: string;
    energy_cost_min?: number | null;
    energy_cost_max?: number | null;
    dpe_year?: number | null;

    // Added for facade compatibility
    locationValue: string | null;
    description: string;
    reservations?: SafeReservation[];
    charges?: any; // { amount: number, included: boolean }

    // Global Availability for Landlord Conflict Checking
    userGlobalSlots?: SafeVisitSlot[];
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
    properties?: SafeProperty[];
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
    listing?: (Listing & {
        rentalUnit: RentalUnit & {
            property: Property & {
                owner: User
            }
        }
    }) | null
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
