
import { NextResponse } from "next/server";
import axios from "axios";

// Paris Open Data API Endpoint
const PARIS_API_URL = "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/logement-encadrement-des-loyers/records";

// Calculate fallback locally if API fails or not eligible
import { calculateRentControl } from "../../properties/[listingId]/edit/components/rentControlUtils";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { lat, lon, roomCount, buildYear, isFurnished, surface, city, listing } = body;

        // 1. Check eligibility for Paris API (Strict check: City name or Zip logic)
        // Levallois is NOT Paris for rent caps, despite getting "Zone Tendue" tax status.
        // We only want to trigger the Paris API (Plafond) for Paris proper.
        const normalizedCity = city?.toLowerCase().trim() || '';
        // Check for 'paris' exact match or 'paris ' prefix, OR zip code 75
        const isParis = normalizedCity === 'paris' ||
            normalizedCity.startsWith('paris ') ||
            (listing && listing.zipCode && listing.zipCode.startsWith('75')) ||
            // Fallback: if we have "arrondissement" in city name
            normalizedCity.includes('arrondissement');

        if (!isParis) {
            // Use local fallback (Will handle Levallois as "Not Eligible" or generic zone if supported)
            const localResult = calculateRentControl({ ...listing, surface, roomCount, buildYear, isFurnished }, city || 'proville');
            return NextResponse.json(localResult);
        }

        // 2. Map Build Year to Era Facets
        // Facets: "Avant 1946", "1946-1970", "1971-1990", "Apres 1990"
        let epoque = "Avant 1946";
        if (buildYear >= 1946 && buildYear <= 1970) epoque = "1946-1970";
        else if (buildYear >= 1971 && buildYear <= 1990) epoque = "1971-1990";
        else if (buildYear > 1990) epoque = "Apres 1990";

        // 3. Map Furnished
        const meuble_txt = isFurnished ? "meublé" : "non meublé";

        // 4. Query API (V2.1 uses SQL-like WHERE clause for spatial filtering)
        // We Use `intersects` to find the precise zone (Quarter) containing the point.
        // Syntax: intersects(geo_shape, geom'POINT(lon lat)')
        const whereClause = `piece=${roomCount === 0 ? 1 : Math.min(roomCount, 4)} AND epoque="${epoque}" AND meuble_txt="${meuble_txt}" AND intersects(geo_shape, geom'POINT(${lon} ${lat})')`;

        const response = await axios.get(PARIS_API_URL, {
            params: {
                where: whereClause,
                limit: 1
            }
        });

        if (response.data.results && response.data.results.length > 0) {
            const data = response.data.results[0];

            // data.ref = Loyer de référence
            // data.max = Loyer majoré (Plafond)
            // data.min = Loyer minoré

            const maxRentPerSqm = data.max;
            const refRentPerSqm = data.ref;

            const maxRent = Math.round(surface * maxRentPerSqm);

            return NextResponse.json({
                isEligible: true,
                source: 'official_api',
                maxRent: maxRent,
                referenceRent: refRentPerSqm,
                zone: `${data.nom_quartier} (Paris)`,
                message: `Plafond officiel : ${maxRentPerSqm} €/m² (Quartier ${data.nom_quartier}). Année: ${epoque}.`
            });
        }

        // Check if maybe we missed mostly because of room count cap or something distinct?
        // If API returns nothing, maybe location isn't covered or criteria mismatch.
        // Fallback to local.
        const localResult = calculateRentControl({ ...listing, surface, roomCount, buildYear, isFurnished }, city || 'paris');
        return NextResponse.json(localResult);

    } catch (error) {
        console.error("Rent Control API Error:", error);
        return NextResponse.json({
            isEligible: false,
            message: "Erreur lors du calcul officiel. Veuillez réessayer."
        }, { status: 500 });
    }
}
