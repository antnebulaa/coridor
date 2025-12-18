
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

        // 1. Check eligibility for Paris API (Based generally on coordinates or explicit city check)
        // For strictness, if we have lat/lon, we use them.
        const isParis = (city && city.toLowerCase().includes('paris')) || (lat && lat > 48.81 && lat < 48.91 && lon > 2.22 && lon < 2.47);

        if (!isParis) {
            // Use local fallback
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

        // 4. Query API
        // Filter by geofilter.distance to find the zone containing the point.
        // We actually want the reference rent for this specific set of criteria at this location.
        // The dataset records are "zones" with reference prices for specific types.
        // We filter by location AND criteria.

        const whereClause = `piece=${roomCount === 0 ? 1 : Math.min(roomCount, 4)} AND epoque="${epoque}" AND meuble_txt="${meuble_txt}"`;

        // We use 'geofilter.distance(geo_shape, <lat>, <lon>, <dist>)' or just rely on the fact that if we use geofilter.distance
        // with a small radius (e.g. 10m) we land in the polygon.
        // However, the Paris API often works best with `geofilter.distance=lat,lon,distance`

        const response = await axios.get(PARIS_API_URL, {
            params: {
                where: whereClause,
                limit: 1,
                "geofilter.distance": `${lat},${lon},100` // 100 meters tolerance to find the zone
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
