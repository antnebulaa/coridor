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

    // 1. Check Cache (if listingId provided)
    if (listingId) {
        try {
            const listing = await prisma.listing.findUnique({
                where: { id: listingId },
                select: { transitData: true }
            });

            if (listing?.transitData) {
                console.log("Returning cached transit data for listing:", listingId);
                return NextResponse.json(listing.transitData);
            }
        } catch (error) {
            console.error("Cache check failed:", error);
            // Continue to fetch fresh data if cache check fails
        }
    }

    const apiKey = process.env.HERE_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: "HERE API key is missing" },
            { status: 500 }
        );
    }

    try {
        // HERE Public Transit API v8 - Stations endpoint
        // https://developer.here.com/documentation/public-transit/dev_guide/index.html

        // Construct URL manually to avoid ANY encoding issues
        // HERE API sometimes rejects encoded colons/commas in the 'in' parameter
        const baseUrl = "https://transit.router.hereapi.com/v8/stations";

        // Round coordinates to 6 decimal places
        const cleanLat = Number(lat).toFixed(6);
        const cleanLng = Number(lng).toFixed(6);

        // Use 'maxPlaces' instead of 'max'
        // Remove 'circle:' prefix as per documentation examples
        const url = `${baseUrl}?apiKey=${apiKey}&in=${cleanLat},${cleanLng};r=1000&return=transport&maxPlaces=20`;

        console.log("Calling HERE API:", url.replace(apiKey, "HIDDEN_KEY"));

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            console.error("HERE API Error Body:", JSON.stringify(data, null, 2));
            throw new Error(data.title || data.cause || "Unknown HERE API error");
        }

        const stations = data.stations;
        const lines: any[] = [];
        const seenLines = new Set();

        stations.forEach((station: any) => {
            if (station.transports) {
                station.transports.forEach((transport: any) => {
                    // Create a unique key for the line to avoid duplicates
                    const lineKey = `${transport.name}-${transport.headsign}`;

                    if (!seenLines.has(lineKey)) {
                        seenLines.add(lineKey);
                        lines.push({
                            name: transport.name,
                            category: transport.mode, // Correct field is 'mode', not 'category'
                            color: transport.color,
                            textColor: transport.textColor,
                            headsign: transport.headsign,
                            operator: transport.operator
                        });
                    }
                });
            }
        });

        // Sort lines by category and name
        lines.sort((a, b) => {
            if (a.category !== b.category) {
                return a.category.localeCompare(b.category);
            }
            return a.name.localeCompare(b.name);
        });

        // 2. Save to Cache (if listingId provided and we have data)
        if (listingId && lines.length > 0) {
            try {
                await prisma.listing.update({
                    where: { id: listingId },
                    data: { transitData: lines }
                });
                console.log("Cached transit data for listing:", listingId);
            } catch (error) {
                console.error("Failed to cache transit data:", error);
            }
        }

        return NextResponse.json(lines);
    } catch (error: any) {
        console.error("HERE API Error:", error.message);
        return NextResponse.json(
            {
                error: "Failed to fetch transit data",
                details: error.message
            },
            { status: 500 }
        );
    }
}
