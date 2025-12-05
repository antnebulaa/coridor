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
                visitSlots: true,
                visits: true
            }
        });

        if (!listing) {
            return NextResponse.json({ error: "Listing not found" }, { status: 404 });
        }

        const duration = listing.visitDuration || 20;
        const capacityPerSlot = 2;

        const availableSlots: any[] = [];

        listing.visitSlots.forEach(slot => {
            const dateStr = format(new Date(slot.date), 'yyyy-MM-dd');
            let currentTime = parse(`${dateStr} ${slot.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
            const endTime = parse(`${dateStr} ${slot.endTime}`, 'yyyy-MM-dd HH:mm', new Date());

            while (isBefore(currentTime, endTime)) {
                const nextTime = addMinutes(currentTime, duration);
                if (isBefore(endTime, nextTime) && endTime.getTime() !== nextTime.getTime()) break; // specific end time check

                const slotStartStr = format(currentTime, 'HH:mm');

                // Count bookings for this specific slot
                const bookingsCount = listing.visits.filter(visit =>
                    visit.status !== 'CANCELLED' &&
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
