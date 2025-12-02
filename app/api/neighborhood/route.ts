import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");

    if (!latParam || !lngParam) {
        return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
    }

    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);

    if (isNaN(lat) || isNaN(lng)) {
        return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    try {
        // Radii in meters
        const r500 = 500;   // ~5-7 min walk
        const r1000 = 1000; // ~15 min walk

        const result = await prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) FILTER (WHERE type = 'BAKERY' AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${r500})) as bakeries,
        COUNT(*) FILTER (WHERE type = 'SUPERMARKET' AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${r1000})) as supermarkets,
        COUNT(*) FILTER (WHERE type = 'GROCERY' AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${r500})) as groceries,
        COUNT(*) FILTER (WHERE type = 'PHARMACY' AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${r500})) as pharmacies,
        COUNT(*) FILTER (WHERE type = 'DOCTOR' AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${r1000})) as doctors,
        COUNT(*) FILTER (WHERE type = 'BAR' AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${r500})) as bars,
        COUNT(*) FILTER (WHERE type = 'RESTAURANT' AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${r500})) as restaurants,
        COUNT(*) FILTER (WHERE type = 'SCHOOL' AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${r1000})) as schools
      FROM "Amenity"
      WHERE ST_DWithin(
        geom,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${r1000} -- Max radius optimization
      );
    `;

        const counts = result[0];

        // Simple scoring logic (can be refined)
        // Convert BigInt to Number for JSON serialization
        const data = {
            bakeries: Number(counts.bakeries || 0),
            supermarkets: Number(counts.supermarkets || 0),
            groceries: Number(counts.groceries || 0),
            pharmacies: Number(counts.pharmacies || 0),
            doctors: Number(counts.doctors || 0),
            bars: Number(counts.bars || 0),
            restaurants: Number(counts.restaurants || 0),
            schools: Number(counts.schools || 0),
        };

        // Calculate scores (0-10)
        const scores = {
            convenience: Math.min(10, (data.supermarkets * 3) + data.groceries + data.bakeries + (data.pharmacies * 2)),
            health: Math.min(10, (data.doctors * 3) + (data.pharmacies * 2)),
            lifestyle: Math.min(10, data.bars + data.restaurants),
            education: Math.min(10, data.schools * 3)
        };

        return NextResponse.json({ counts: data, scores });
    } catch (error) {
        console.error("Neighborhood API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
