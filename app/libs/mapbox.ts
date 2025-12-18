
import axios from 'axios';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

/**
 * Fetches the isochrone polygon from Mapbox API.
 * @param coordinates [longitude, latitude]
 * @param transportMode 'driving' | 'cycling' | 'walking'
 * @param minutes number (e.g. 15, 30, 45, 60)
 */
export async function getIsochrone(coordinates: number[], transportMode: string, minutes: number) {
    if (!MAPBOX_TOKEN) {
        throw new Error("Mapbox Token missing");
    }

    // Mapbox profiles: 'driving', 'cycling', 'walking'
    // Ensure we map our app's internal modes if they differ, but they seem consistent.
    // 'TRANSIT' is not supported by standard Isochrone API. Fallback or Error? 
    // Plan said: "On commencera avec les modes supportés par défaut"
    let profile = 'driving';
    if (transportMode === 'CYCLING') profile = 'cycling';
    if (transportMode === 'WALKING') profile = 'walking';
    // If user selected TRANSIT, we default to DRIVING for now as discussed, or maybe raise error? 
    // Let's default to driving to prevent crash, user knows limitation or we handle UI side.
    if (transportMode === 'TRANSIT') profile = 'driving';

    const url = `https://api.mapbox.com/isochrone/v1/mapbox/${profile}/${coordinates[0]},${coordinates[1]}?contours_minutes=${minutes}&polygons=true&access_token=${MAPBOX_TOKEN}`;

    try {
        const response = await axios.get(url);
        return response.data; // GeoJSON FeatureCollection
    } catch (error) {
        console.error("Error fetching isochrone:", error);
        return null;
    }
}
