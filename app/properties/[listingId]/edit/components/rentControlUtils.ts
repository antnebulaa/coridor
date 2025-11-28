import { SafeListing } from "@/types";

interface RentControlResult {
    isEligible: boolean;
    maxRent?: number;
    referenceRent?: number;
    zone?: string;
    message?: string;
}

// Base rents (Mock data - simplified averages)
const CITY_RATES: Record<string, number> = {
    'paris': 26.0,
    'lille': 13.0,
    'lomme': 13.0,
    'hellemmes': 13.0,
    'lyon': 16.0,
    'villeurbanne': 15.0,
    'bordeaux': 15.5,
    'montpellier': 14.5,
    'bagnolet': 18.0,
    'bobigny': 16.0,
    'bondy': 16.0,
    'le pré-saint-gervais': 19.0,
    'les lilas': 20.0,
    'montreuil': 21.0,
    'noisy-le-sec': 17.0,
    'pantin': 20.0,
    'romainville': 18.0,
    'aubervilliers': 17.0,
    'la courneuve': 15.0,
    'saint-denis': 18.0,
    'saint-ouen': 20.0,
};

const MAJORATION_PERCENTAGE = 0.20; // +20% for majorated rent

export const calculateRentControl = (listing: SafeListing, city: string): RentControlResult => {
    const normalizedCity = city.toLowerCase().trim();

    // Check if city is in our list
    // We use a simple includes check to handle cases like "Paris 11e" matching "paris"
    const matchedCityKey = Object.keys(CITY_RATES).find(key => normalizedCity.includes(key));

    if (!matchedCityKey) {
        return {
            isEligible: false,
            message: "Ce logement n'est pas situé dans une zone soumise à l'encadrement des loyers (ou ville non supportée par la simulation)."
        };
    }

    if (!listing.surface) {
        return {
            isEligible: false,
            message: "La surface du logement est nécessaire pour calculer le plafonnement."
        };
    }

    let baseRentPerSqm = CITY_RATES[matchedCityKey];

    // Adjustments based on criteria (Simplified logic)

    // 1. Era (Construction Year)
    if (listing.buildYear) {
        if (listing.buildYear < 1946) baseRentPerSqm += 2;
        else if (listing.buildYear > 1990) baseRentPerSqm += 1;
    }

    // 2. Furnished
    if (listing.isFurnished) {
        baseRentPerSqm += 2.5; // Premium for furnished
    }

    // 3. Room Count (Smaller apartments often have higher rent per sqm)
    if (listing.roomCount === 1) {
        baseRentPerSqm += 1.5;
    } else if (listing.roomCount > 3) {
        baseRentPerSqm -= 0.5;
    }

    // Calculate Reference Rent Majorated
    const referenceRentPerSqm = baseRentPerSqm;
    const majoratedRentPerSqm = baseRentPerSqm * (1 + MAJORATION_PERCENTAGE);

    const maxRent = Math.round(listing.surface * majoratedRentPerSqm);

    const typeLabel = listing.isFurnished ? "Meublé" : "Non meublé";
    const roomLabel = `${listing.roomCount} pièce${listing.roomCount > 1 ? 's' : ''}`;
    const yearLabel = listing.buildYear ? `, Construit en ${listing.buildYear}` : "";
    const cityLabel = matchedCityKey.charAt(0).toUpperCase() + matchedCityKey.slice(1);

    return {
        isEligible: true,
        maxRent: maxRent,
        referenceRent: parseFloat(majoratedRentPerSqm.toFixed(2)),
        zone: `${cityLabel} (Zone Tendue)`,
        message: `Loyer de référence majoré estimé : ${majoratedRentPerSqm.toFixed(2)} €/m² (${typeLabel}, ${roomLabel}${yearLabel})`
    };
};
