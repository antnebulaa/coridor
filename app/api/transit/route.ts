import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const listingId = searchParams.get("listingId");

    if (!lat || !lng) {
        return NextResponse.json(
            { error: "Latitude and longitude are required" },
            { status: 400 }
        );
    }

    // 1. Check Cache
    if (listingId) {
        try {
            const listing = await prisma.listing.findUnique({
                where: { id: listingId },
                select: {
                    rentalUnit: {
                        select: {
                            property: {
                                select: {
                                    transitData: true,
                                    id: true
                                }
                            }
                        }
                    }
                }
            });

            const property = listing?.rentalUnit?.property;

            if (property?.transitData) {
                const data: any = property.transitData;
                // Check version to force update
                const isVersionMatch = data.algorithmVersion === "v3.0"; // Bump to V3
                const isMainConnectionValid = !data.mainConnection || (data.mainConnection.name && data.mainConnection.name.trim() !== "" && data.mainConnection.name !== "Station Inconnue");

                if ((data.mainConnection || data.nearby) && isMainConnectionValid && isVersionMatch) {
                    return NextResponse.json(data);
                }
            }
        } catch (error) {
            console.error("Cache check failed:", error);
        }
    }

    const apiKey = process.env.HERE_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "HERE API key is missing" }, { status: 500 });
    }

    try {
        const baseUrl = "https://transit.router.hereapi.com/v8/stations";
        const cleanLat = Number(lat).toFixed(6);
        const cleanLng = Number(lng).toFixed(6);

        // --- Helpers ---
        const fetchStations = async (radius: number, max: number = 50) => {
            const url = `${baseUrl}?apiKey=${apiKey}&in=${cleanLat},${cleanLng};r=${radius}&return=transport&maxPlaces=${max}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("HERE API Error");
            return res.json();
        };

        const isHeavy = (mode: string) => {
            const m = mode?.toLowerCase() || "";
            return m.includes('subway') || m.includes('metro') || m.includes('rail') || m.includes('train') || m.includes('regional') || m.includes('tram') || m.includes('rer') || m.includes('lightrail');
        };

        const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
            const R = 6371e3;
            const φ1 = lat1 * Math.PI / 180;
            const φ2 = lat2 * Math.PI / 180;
            const Δφ = (lat2 - lat1) * Math.PI / 180;
            const Δλ = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ1) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c; // meters
        };

        // --- Step 1: Champion Selection with SCORING (V3 Strategy) ---

        let championObs: any = null;
        let mainConnection = null;

        let stationsA = (await fetchStations(1200, 50)).stations || [];
        let heavyA = stationsA.filter((s: any) => s.transports?.some((t: any) => isHeavy(t.mode)));

        // NEW: Scoring Logic
        const getScore = (station: any) => {
            const dist = getDistance(Number(lat), Number(lng), station.place.location.lat, station.place.location.lng);
            const walkTime = Math.ceil(dist / 80) + 2;

            let bonus = 0;
            const modes = station.transports || [];

            // Check Modes
            // Metro > Tram > Train
            const hasMetro = modes.some((m: any) => m.mode.includes('subway') || m.mode.includes('metro'));
            const hasTram = modes.some((m: any) => m.mode.includes('tram') || m.mode.includes('lightrail'));
            const hasTrain = modes.some((m: any) => isHeavy(m.mode) && !m.mode.includes('subway') && !m.mode.includes('metro') && !m.mode.includes('tram') && !m.mode.includes('lightrail'));

            if (hasMetro) bonus = 4;        // Huge preference
            else if (hasTram) bonus = 1;    // Slight preference over train
            else if (hasTrain) bonus = 0;

            return { score: walkTime - bonus, walkTime, dist };
        };

        // Sort A by Score
        heavyA.sort((a: any, b: any) => {
            const mA = getScore(a);
            const mB = getScore(b);

            if (mA.score !== mB.score) return mA.score - mB.score;
            return mA.dist - mB.dist;
        });

        if (heavyA.length > 0) {
            championObs = heavyA[0];
        } else {
            let stationsB = (await fetchStations(5000, 10)).stations || [];
            let heavyB = stationsB.filter((s: any) => s.transports?.some((t: any) => isHeavy(t.mode)));
            if (heavyB.length > 0) {
                championObs = heavyB[0];
            } else {
                let stationsC = (await fetchStations(400, 20)).stations || [];
                if (stationsC.length > 0) {
                    championObs = stationsC[0];
                }
            }
        }

        if (championObs) {
            const distMeters = getDistance(Number(lat), Number(lng), championObs.place.location.lat, championObs.place.location.lng);

            const allModes = championObs.transports || [];
            const heavyModes = allModes.filter((t: any) => isHeavy(t.mode));
            const modesToConsider = heavyModes.length > 0 ? heavyModes : allModes;

            modesToConsider.sort((a: any, b: any) => {
                const score = (mode: string) => {
                    if (mode.includes('subway') || mode.includes('metro')) return 1;
                    if (mode.includes('rer')) return 2;
                    if (mode.includes('train') || mode.includes('rail')) return 3;
                    if (mode.includes('tram')) return 4;
                    return 5;
                };
                return score(a.mode) - score(b.mode);
            });

            if (modesToConsider.length > 0) {
                const championMode = modesToConsider[0];
                const sameLineModes = modesToConsider.filter((m: any) => m.name === championMode.name && m.mode === championMode.mode);
                const uniqueHeadsigns = Array.from(new Set(sameLineModes.map((m: any) => m.headsign)));
                const combinedHeadsign = uniqueHeadsigns.slice(0, 3).join(" / ");
                let walkTime = Math.ceil(distMeters / 80) + 2;

                mainConnection = {
                    name: championObs.name || championObs.place?.name || "Station Inconnue",
                    line: championMode.name,
                    headsign: combinedHeadsign,
                    type: championMode.mode,
                    color: championMode.color,
                    textColor: championMode.textColor,
                    distance: Math.round(distMeters),
                    walkTime: walkTime
                };
            }
        }

        // --- Step 2: Proximity List ---

        let stationsProximity = (await fetchStations(800, 50)).stations || [];
        const nearbyMap = new Map();

        stationsProximity.forEach((station: any) => {
            const sName = station.name || station.place?.name || "Arrêt Inconnu";
            if (mainConnection && sName === mainConnection.name) return;

            const dist = getDistance(Number(lat), Number(lng), station.place.location.lat, station.place.location.lng);
            const walkTime = Math.ceil(dist / 80) + 2;

            if (!nearbyMap.has(sName)) {
                nearbyMap.set(sName, {
                    stationName: sName,
                    distance: Math.round(dist),
                    walkTime: walkTime,
                    lines: [],
                    types: new Set(),
                    hasHeavy: false
                });
            }

            const entry = nearbyMap.get(sName);

            station.transports?.forEach((t: any) => {
                const isTHeavy = isHeavy(t.mode);
                if (isTHeavy) entry.hasHeavy = true;
                if (!entry.lines.some((l: any) => l.name === t.name && l.type === t.mode)) {
                    entry.lines.push({
                        name: t.name,
                        color: t.color,
                        textColor: t.textColor,
                        type: t.mode,
                        isHeavy: isTHeavy
                    });
                    entry.types.add(t.mode);
                }
            });
        });

        let nearbyList = Array.from(nearbyMap.values()).map((item: any) => ({
            ...item,
            types: Array.from(item.types)
        }));

        nearbyList.forEach((item: any) => {
            if (item.hasHeavy) {
                item.lines = item.lines.filter((l: any) => l.isHeavy);
                item.types = item.types.filter((t: string) => isHeavy(t));
            }
        });

        nearbyList.sort((a, b) => {
            if (a.hasHeavy && !b.hasHeavy) return -1;
            if (!a.hasHeavy && b.hasHeavy) return 1;
            return a.distance - b.distance;
        });

        // The Guillotine (V2 Logic)
        const hasHeavyInList = nearbyList.some((item: any) => item.hasHeavy);
        if (hasHeavyInList) {
            nearbyList = nearbyList.filter((item: any) => item.hasHeavy);
        } else {
            nearbyList = nearbyList.slice(0, 3);
        }

        // Sort implies priority, so we just take the top candidates later by deduping

        // --- NEW: Smart Deduplication (V2.5) ---
        // Filter out stations that don't add new lines (defined by mode+name)

        const seenLines = new Set<string>();

        // Init with Champion
        if (championObs && championObs.transports) {
            championObs.transports.forEach((t: any) => {
                const isTHeavy = isHeavy(t.mode);
                if (hasHeavyInList && !isTHeavy) return; // Ignore Bus lines of Heavy Champion IF there are other heaviest in list?
                // Wait, simplifying: IF champion is heavy, we mark its HEAVY lines as seen.
                seenLines.add(`${t.mode}_${t.name}`);
            });
        }

        const dedupedList: any[] = [];

        for (const station of nearbyList) {
            let contributesNew = false;

            for (const line of station.lines) {
                const id = `${line.type}_${line.name}`;
                if (hasHeavyInList && !line.isHeavy) continue;

                if (!seenLines.has(id)) {
                    contributesNew = true;
                }
            }

            if (contributesNew) {
                dedupedList.push(station);
                for (const line of station.lines) {
                    const id = `${line.type}_${line.name}`;
                    if (hasHeavyInList && !line.isHeavy) continue;
                    seenLines.add(id);
                }
            }
        }

        // Use the deduped list
        const finalList = dedupedList;

        const result = {
            algorithmVersion: "v3.0",
            mainConnection,
            nearby: finalList
        };

        // 2. Save to Cache
        if (listingId) {
            try {
                const listing = await prisma.listing.findUnique({
                    where: { id: listingId },
                    select: { rentalUnit: { select: { propertyId: true } } }
                });

                if (listing?.rentalUnit?.propertyId) {
                    await prisma.property.update({
                        where: { id: listing.rentalUnit.propertyId },
                        data: { transitData: result }
                    });
                }
            } catch (error) {
                console.error("Failed to cache transit data:", error);
            }
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("HERE API Error:", error.message);
        return NextResponse.json(
            { error: "Failed to fetch transit data" },
            { status: 500 }
        );
    }
}
