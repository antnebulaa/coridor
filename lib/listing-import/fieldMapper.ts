/**
 * Maps LLM-extracted listing data to Coridor form field values.
 * These values are injected into the RentModal form via react-hook-form's reset().
 */

export interface ExtractedListingData {
    title: string | null;
    propertyType: 'APARTMENT' | 'HOUSE' | 'STUDIO' | 'LOFT' | null;
    rentAmount: number | null;
    chargesAmount: number | null;
    chargesIncluded: boolean | null;
    securityDeposit: number | null;
    surface: number | null;
    roomCount: number | null;
    bedroomCount: number | null;
    bathroomCount: number | null;
    floor: number | null;
    totalFloors: number | null;
    hasElevator: boolean | null;
    hasBalcony: boolean | null;
    hasParking: boolean | null;
    hasCellar: boolean | null;
    isFurnished: boolean | null;
    dpeGrade: string | null;
    gesGrade: string | null;
    heatingType: string | null;
    constructionYear: number | null;
    address: {
        street: string | null;
        city: string | null;
        zipCode: string | null;
        neighborhood: string | null;
    } | null;
    description: string | null;
    availableFrom: string | null;
}

export interface MappedFormValues {
    title: string;
    description: string;
    category: string;
    price: number | string;
    charges: number | string;
    securityDeposit: number;
    surface: number | undefined;
    roomCount: number;
    bedroomCount: number;
    bathroomCount: number;
    floor: string;
    totalFloors: string;
    isFurnished: boolean;
    dpe: string;
    ges: string;
    constructionPeriod: string;
    amenities: string[];
    // Location will be resolved separately via geocoding
    locationHint: {
        city: string | null;
        zipCode: string | null;
        street: string | null;
    };
}

/** Which fields were successfully imported (for UI badges) */
export type ImportedFields = Set<string>;

const PROPERTY_TYPE_TO_CATEGORY: Record<string, string> = {
    'APARTMENT': 'Appartement',
    'STUDIO': 'Appartement',
    'LOFT': 'Appartement',
    'HOUSE': 'Maison',
};

function yearToConstructionPeriod(year: number | null): string {
    if (!year) return '';
    if (year < 1949) return 'Avant 1949';
    if (year < 1975) return '1949 - 1974';
    if (year < 1990) return '1975 - 1989';
    if (year < 2005) return '1990 - 2005';
    return '2005+';
}

export function mapToCoridorFields(
    extracted: ExtractedListingData
): { values: Partial<MappedFormValues>; importedFields: ImportedFields } {
    const importedFields: ImportedFields = new Set<string>();
    const values: Partial<MappedFormValues> = {};

    // Title
    if (extracted.title) {
        values.title = extracted.title;
        importedFields.add('title');
    }

    // Description
    if (extracted.description) {
        values.description = extracted.description;
        importedFields.add('description');
    }

    // Category (property type)
    if (extracted.propertyType) {
        values.category = PROPERTY_TYPE_TO_CATEGORY[extracted.propertyType] || 'Appartement';
        importedFields.add('category');
    }

    // Price
    if (extracted.rentAmount != null) {
        values.price = extracted.rentAmount;
        importedFields.add('price');
    } else if (extracted.chargesIncluded && extracted.chargesAmount != null) {
        // If only CC price available, try to subtract charges
        // Don't set price if we can't determine HC amount
    }

    // Charges
    if (extracted.chargesAmount != null) {
        values.charges = extracted.chargesAmount;
        importedFields.add('charges');
    }

    // Security deposit
    if (extracted.securityDeposit != null) {
        values.securityDeposit = extracted.securityDeposit;
        importedFields.add('securityDeposit');
    }

    // Surface
    if (extracted.surface != null) {
        values.surface = extracted.surface;
        importedFields.add('surface');
    }

    // Room counts
    if (extracted.roomCount != null) {
        values.roomCount = extracted.roomCount;
        importedFields.add('roomCount');
    }
    if (extracted.bedroomCount != null) {
        values.bedroomCount = extracted.bedroomCount;
        importedFields.add('bedroomCount');
    }
    if (extracted.bathroomCount != null) {
        values.bathroomCount = extracted.bathroomCount;
        importedFields.add('bathroomCount');
    }

    // Floor
    if (extracted.floor != null) {
        values.floor = String(extracted.floor);
        importedFields.add('floor');
    }
    if (extracted.totalFloors != null) {
        values.totalFloors = String(extracted.totalFloors);
        importedFields.add('totalFloors');
    }

    // Furnished
    if (extracted.isFurnished != null) {
        values.isFurnished = extracted.isFurnished;
        importedFields.add('isFurnished');
    }

    // Energy
    if (extracted.dpeGrade) {
        values.dpe = extracted.dpeGrade;
        importedFields.add('dpe');
    }
    if (extracted.gesGrade) {
        values.ges = extracted.gesGrade;
        importedFields.add('ges');
    }

    // Construction period
    if (extracted.constructionYear) {
        values.constructionPeriod = yearToConstructionPeriod(extracted.constructionYear);
        importedFields.add('constructionPeriod');
    }

    // Amenities (map booleans to amenity string keys)
    const amenities: string[] = [];
    if (extracted.hasElevator) { amenities.push('hasElevator'); importedFields.add('hasElevator'); }
    if (extracted.hasBalcony) { amenities.push('hasBalcony'); importedFields.add('hasBalcony'); }
    if (extracted.hasParking) { amenities.push('hasParking'); importedFields.add('hasParking'); }
    if (extracted.hasCellar) { amenities.push('hasCave'); importedFields.add('hasCave'); }
    if (amenities.length > 0) {
        values.amenities = amenities;
    }

    // Location hint (not a direct form field — needs geocoding)
    values.locationHint = {
        city: extracted.address?.city || null,
        zipCode: extracted.address?.zipCode || null,
        street: extracted.address?.street || null,
    };
    if (extracted.address?.city || extracted.address?.zipCode) {
        importedFields.add('location');
    }

    return { values, importedFields };
}
