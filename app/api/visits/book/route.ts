import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { format } from "date-fns";

export async function POST(
    request: Request
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { listingId, date, startTime, endTime } = body;

    if (!listingId || !date || !startTime || !endTime) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    try {
        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            include: { visits: true }
        });

        if (!listing) {
            return NextResponse.json({ error: "Listing not found" }, { status: 404 });
        }

        // Check availability again (simple check)
        const dateStr = format(new Date(date), 'yyyy-MM-dd');
        const bookingsCount = listing.visits.filter((visit: any) =>
            visit.status !== 'CANCELLED' &&
            format(new Date(visit.date), 'yyyy-MM-dd') === dateStr &&
            visit.startTime === startTime
        ).length;

        if (bookingsCount >= 2) { // Cap at 2
            return NextResponse.json({ error: "Slot no longer available" }, { status: 409 });
        }

        const visit = await prisma.visit.create({
            data: {
                listingId,
                candidateId: currentUser.id,
                date: new Date(date),
                startTime,
                endTime,
                status: 'CONFIRMED'
            }
        });

        // Update application status
        const application = await prisma.rentalApplication.findFirst({
            where: {
                listingId: listingId,
                candidateScope: {
                    creatorUserId: currentUser.id
                }
            }
        });

        if (application) {
            await prisma.rentalApplication.update({
                where: { id: application.id },
                data: { status: 'VISIT_CONFIRMED' }
            });
        }

        return NextResponse.json(visit);
    } catch (error) {
        console.error("Booking Error:", error);
        return NextResponse.json({ error: "Booking Failed" }, { status: 500 });
    }
}
