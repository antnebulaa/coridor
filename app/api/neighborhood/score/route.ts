import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');

    if (!lat || !lng) {
        return NextResponse.json({ error: 'Coordinates required' }, { status: 400 });
    }

    try {
        // Define radius for different categories
        // Noise: 100m (0.1km)
        // Convenience: 300m (0.3km) for Bakery/Supermarket, 500m (0.5km) for Pharmacy, 1km for Doctor

        // We can fetch all amenities within 1km to optimize
        // Using Haversine formula in raw SQL
        // 6371 is Earth radius in km

        const amenities = await prisma.$queryRaw`
            SELECT 
                type, 
                (
                    6371 * acos(
                        cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lng})) + 
                        sin(radians(${lat})) * sin(radians(latitude))
                    )
                ) as distance
            FROM "Amenity"
            WHERE (
                6371 * acos(
                    cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lng})) + 
                    sin(radians(${lat})) * sin(radians(latitude))
                )
            ) < 1.0
        ` as { type: string, distance: number }[];

        // Process results
        let barCount = 0;
        let bakeryCount = 0;
        let supermarketCount = 0;
        let pharmacyCount = 0;
        let doctorCount = 0;

        amenities.forEach((a: any) => {
            if (a.type === 'BAR' && a.distance <= 0.1) barCount++;
            if (a.type === 'BAKERY' && a.distance <= 0.3) bakeryCount++;
            if (a.type === 'SUPERMARKET' && a.distance <= 0.3) supermarketCount++;
            if (a.type === 'PHARMACY' && a.distance <= 0.5) pharmacyCount++;
            if (a.type === 'DOCTOR' && a.distance <= 1.0) doctorCount++;
        });

        // Scoring Logic

        // 1. Noise (Vie nocturne)
        // 0-2 bars = 10/10 (Calm)
        // 3-5 bars = 7/10 (Lively)
        // 6-10 bars = 4/10 (Noisy)
        // >10 bars = 1/10 (Very Noisy)
        // Note: User might want "Animé" as positive. Let's return a label too.
        let noiseScore = 10;
        let noiseLabel = "Calme";
        if (barCount > 10) { noiseScore = 2; noiseLabel = "Très bruyant"; }
        else if (barCount > 5) { noiseScore = 5; noiseLabel = "Animé / Bruyant"; }
        else if (barCount > 2) { noiseScore = 8; noiseLabel = "Animé"; }

        // 2. Convenience (Vie pratique)
        // Max 10 points
        // Supermarket: +3 (max 3)
        // Bakery: +2 (max 2)
        // Pharmacy: +2 (max 2)
        // Doctor: +3 (max 3)
        let convenienceScore = 0;
        if (supermarketCount > 0) convenienceScore += 3;
        if (bakeryCount > 0) convenienceScore += 2;
        if (pharmacyCount > 0) convenienceScore += 2;
        if (doctorCount > 0) convenienceScore += 3;

        // 3. Transport
        // For now, mock or use simple logic if we had data.
        // Let's assume neutral if no data.
        const transportScore = 5;

        return NextResponse.json({
            noise: {
                score: noiseScore,
                label: noiseLabel,
                count: barCount
            },
            convenience: {
                score: convenienceScore,
                details: {
                    bakeries: bakeryCount,
                    supermarkets: supermarketCount,
                    pharmacies: pharmacyCount,
                    doctors: doctorCount
                }
            },
            transport: {
                score: transportScore,
                label: "Données non disponibles"
            }
        });

    } catch (error) {
        console.error("Scoring Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
