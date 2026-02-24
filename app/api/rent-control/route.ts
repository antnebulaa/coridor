
import { NextResponse } from "next/server";
import axios from "axios";
import { lookupRentControl } from "@/lib/rentControl";

// Paris Open Data API Endpoint
const PARIS_API_URL = "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/logement-encadrement-des-loyers/records";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { lat, lon, roomCount, buildYear, isFurnished, surface, city, listing } = body;

        const zipCode = listing?.zipCode || '';
        const effectiveCity = city || '';

        // 1. Try local lookup first
        const localResult = lookupRentControl({
            city: effectiveCity,
            zipCode,
            roomCount: roomCount || 1,
            buildYear: buildYear || 2000,
            isFurnished: !!isFurnished,
            surface: surface || 0,
            rentControlZone: listing?.rentControlZone,
        });

        // 2. If Paris (needs geospatial API), call opendata.paris.fr
        if (localResult.needsApi && lat && lon) {
            try {
                // Map Build Year to Era Facets
                let epoque = "Avant 1946";
                if (buildYear >= 1946 && buildYear <= 1970) epoque = "1946-1970";
                else if (buildYear >= 1971 && buildYear <= 1990) epoque = "1971-1990";
                else if (buildYear > 1990) epoque = "Apres 1990";

                const meuble_txt = isFurnished ? "meublé" : "non meublé";
                const pieceCount = roomCount === 0 ? 1 : Math.min(roomCount, 4);

                const whereClause = `piece=${pieceCount} AND epoque="${epoque}" AND meuble_txt="${meuble_txt}" AND intersects(geo_shape, geom'POINT(${lon} ${lat})')`;

                const response = await axios.get(PARIS_API_URL, {
                    params: { where: whereClause, limit: 1 },
                });

                if (response.data.results && response.data.results.length > 0) {
                    const data = response.data.results[0];
                    const maxRentPerSqm = data.max;
                    const refRentPerSqm = data.ref;
                    const minRentPerSqm = data.min;
                    const maxRent = Math.round(surface * maxRentPerSqm);

                    return NextResponse.json({
                        isEligible: true,
                        source: 'official_api',
                        territory: 'Paris',
                        maxRent,
                        referenceRent: refRentPerSqm,
                        referenceRentMax: maxRentPerSqm,
                        referenceRentMin: minRentPerSqm,
                        zone: `${data.nom_quartier} (Paris)`,
                        message: `Plafond officiel : ${maxRentPerSqm} €/m² (Quartier ${data.nom_quartier}). Année: ${epoque}.`,
                    });
                }

                // API returned nothing — coords may be outside Paris
                return NextResponse.json({
                    isEligible: false,
                    source: 'none',
                    message: "Aucune donnée trouvée pour cette localisation à Paris.",
                });
            } catch (parisError) {
                console.error("Paris API error:", parisError);
                return NextResponse.json({
                    isEligible: false,
                    source: 'none',
                    message: "Erreur lors de la récupération des données Paris. Réessayez.",
                }, { status: 500 });
            }
        }

        // 3. Return local lookup result for all other cities
        return NextResponse.json(localResult);

    } catch (error) {
        console.error("Rent Control API Error:", error);
        return NextResponse.json({
            isEligible: false,
            source: 'none',
            message: "Erreur lors du calcul. Veuillez réessayer.",
        }, { status: 500 });
    }
}
