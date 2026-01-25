import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import { format, addMinutes, parse, isBefore } from "date-fns";

interface IParams {
    listingId: string;
}

export async function GET(
    request: Request,
    props: { params: Promise<IParams> }
) {
    const params = await props.params;
    const { listingId } = params;

    if (!listingId) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    try {
        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            include: {
                rentalUnit: {
                    include: {
                        property: true // Get property for coords/owner
                    }
                },
                // visits: true -- REMOVED: We need global visits, not just local ones
            }
        });

        if (!listing) {
            return NextResponse.json({ error: "Listing not found" }, { status: 404 });
        }

        const property = listing.rentalUnit.property;

        // Fetch User's slots
        const userSlots = await prisma.visitSlot.findMany({
            where: {
                userId: property.ownerId
            }
        });

        // FETCH ALL VISITS FOR THIS LANDLORD (Global Availability Check)
        const allLandlordVisits = await prisma.visit.findMany({
            where: {
                listing: {
                    rentalUnit: {
                        property: {
                            ownerId: property.ownerId
                        }
                    }
                },
                status: {
                    not: "CANCELLED"
                }
            }
        });

        const safeListing = listing as any;
        const duration = safeListing.visitDuration || 20;
        const capacityPerSlot = 2;

        const availableSlots: any[] = [];

        // Helper for distance
        const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
            if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
            const R = 6371e3; // metres
            const q1 = lat1 * Math.PI / 180;
            const q2 = lat2 * Math.PI / 180;
            const dq = (lat2 - lat1) * Math.PI / 180;
            const dl = (lon2 - lon1) * Math.PI / 180;

            const a = Math.sin(dq / 2) * Math.sin(dq / 2) +
                Math.cos(q1) * Math.cos(q2) *
                Math.sin(dl / 2) * Math.sin(dl / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            return R * c;
        };

        // Filter slots by location
        const visitSlots = userSlots.filter((slot: any) => {
            // If slot has no location, maybe ignore or assume global? Assuming required location.
            // Dist must be <= radius
            const dist = getDistanceInMeters(slot.latitude, slot.longitude, property.latitude!, property.longitude!);
            return dist <= (slot.radius || 200);
        });

        visitSlots.forEach((slot: any) => {
            const dateStr = format(new Date(slot.date), 'yyyy-MM-dd');
            let currentTime = parse(`${dateStr} ${slot.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
            const endTime = parse(`${dateStr} ${slot.endTime}`, 'yyyy-MM-dd HH:mm', new Date());

            while (isBefore(currentTime, endTime)) {
                const nextTime = addMinutes(currentTime, duration);
                if (isBefore(endTime, nextTime) && endTime.getTime() !== nextTime.getTime()) break; // specific end time check

                const slotStartStr = format(currentTime, 'HH:mm');

                // Count bookings for this specific slot GLOBALLY
                const bookingsCount = allLandlordVisits.filter((visit: any) =>
                    // visit.status !== 'CANCELLED' && // Already filtered in query
                    format(new Date(visit.date), 'yyyy-MM-dd') === dateStr &&
                    visit.startTime === slotStartStr
                ).length;

                if (bookingsCount < capacityPerSlot) {
                    availableSlots.push({
                        date: slot.date,
                        startTime: slotStartStr,
                        endTime: format(nextTime, 'HH:mm'),
                        bookingsCount
                    });
                }

                currentTime = nextTime;
            }
        });

        return NextResponse.json(availableSlots);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
