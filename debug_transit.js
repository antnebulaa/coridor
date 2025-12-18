
const { PrismaClient } = require('@prisma/client');
console.log("Starting Debug...");

// Mock Fetch if running in node without global fetch (Node 18+ has it, but just in case)
// ... assuming Node environment has fetch.

async function run() {
    // 19 Rue Jacques Ibert, 75017 Paris
    const lat = "48.886047";
    const lng = "2.289053";
    const apiKey = process.env.HERE_API_KEY;

    if (!apiKey) {
        console.error("No API KEY in env");
        return;
    }

    console.log(`Fetching for ${lat}, ${lng} with key ${apiKey.substring(0, 5)}...`);

    const baseUrl = "https://transit.router.hereapi.com/v8/stations";

    // FETCH HELPERS
    const fetchStations = async (radius, max = 50) => {
        const url = `${baseUrl}?apiKey=${apiKey}&in=${lat},${lng};r=${radius}&return=transport&maxPlaces=${max}`;
        console.log("Fetching:", url);
        const res = await fetch(url);
        return res.json();
    };

    const isHeavy = (mode) => {
        const m = mode?.toLowerCase() || "";
        return m.includes('subway') || m.includes('metro') || m.includes('rail') || m.includes('train') || m.includes('regional') || m.includes('tram') || m.includes('rer') || m.includes('lightrail');
    };

    // Copy-Paste logic from V4 Route
    // ...
    // Due to complexity, I'll essentially reimplement the logic here to trace it locally.

    // 1. Champion Search
    let stationsA = (await fetchStations(1200, 50)).stations || [];
    console.log(`Found ${stationsA.length} stations in A`);

    let heavyA = stationsA.filter(s => s.transports?.some(t => isHeavy(t.mode)));
    console.log(`Found ${heavyA.length} heavy A`);
    if (heavyA.length > 0) {
        console.log("Sample Station:", JSON.stringify(heavyA[0], null, 2));
    }

    // Simulate Champion Selection
    let championObs = heavyA[0]; // Simplification for debug
    console.log("Champion:", championObs ? championObs.name : "None");

    // 2. Proximity Search
    let stationsProximity = (await fetchStations(800, 50)).stations || [];
    console.log(`Found ${stationsProximity.length} stations in Proximity`);

    // Replicate Deduplication
    let nearbyList = [];
    let seenLines = new Set();

    if (championObs) {
        championObs.transports?.forEach(t => {
            if (isHeavy(t.mode)) {
                console.log("Champion Line (Heavy):", t.mode, t.name);
                seenLines.add(`${t.mode}_${t.name}`);
            }
        });
    }

    const visitedStationIds = new Set();
    if (championObs) visitedStationIds.add(championObs.id);

    let candidates = stationsProximity.filter(s => !visitedStationIds.has(s.id));
    console.log(`Candidates (excluding champion): ${candidates.length}`);

    const hasHeavyInList = candidates.some(c => c.transports?.some(t => isHeavy(t.mode)));
    if (hasHeavyInList) {
        console.log("Has Heavy in list, filtering buses...");
        candidates = candidates.filter(c => c.transports?.some(t => isHeavy(t.mode)));
    }
    console.log(`Candidates after Heavy Filter: ${candidates.length}`);

    for (const station of candidates) {
        console.log(`Checking Station: ${station.name}`);
        let relevantLines = station.transports;
        const stationHasHeavy = relevantLines.some(t => isHeavy(t.mode));

        if (stationHasHeavy) {
            relevantLines = relevantLines.filter(t => isHeavy(t.mode));
        }

        let contributes = false;
        relevantLines.forEach(l => {
            const id = `${l.mode}_${l.name}`;
            if (!seenLines.has(id)) {
                console.log(`  -> New Line found: ${id}`);
                contributes = true;
            } else {
                console.log(`  -> Line seen: ${id}`);
            }
        });

        if (contributes) {
            console.log("  => KEEP");
            relevantLines.forEach(l => seenLines.add(`${l.mode}_${l.name}`));
            nearbyList.push(station.name);
        } else {
            console.log("  => DROP (Redundant)");
        }
    }

    console.log("Final List:", nearbyList);
}

run();
