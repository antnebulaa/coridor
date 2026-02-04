import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { format } from "date-fns";
import { revalidatePath } from "next/cache";
import { broadcastNewVisit } from "@/lib/supabaseServer";

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

        // --- SMART TRAVEL BUFFER CHECK ---
        const reqDate = new Date(date);
        // Normalize range for the day check logic
        const startOfDay = new Date(reqDate); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(reqDate); endOfDay.setHours(23, 59, 59, 999);

        const candidateClashes = await prisma.visit.findMany({
            where: {
                candidateId: currentUser.id,
                status: { in: ['CONFIRMED', 'PENDING'] },
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        const timeToMinutes = (t: string) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };

        const newStart = timeToMinutes(startTime);
        const newEnd = timeToMinutes(endTime);
        const BUFFER_MIN = 90;

        for (const existing of candidateClashes) {
            // Re-verify date string match to be safe
            if (format(new Date(existing.date), 'yyyy-MM-dd') !== dateStr) continue;

            const existingStart = timeToMinutes(existing.startTime);
            const existingEnd = timeToMinutes(existing.endTime);

            // Conflict: Overlap with Buffer
            if (newStart < (existingEnd + BUFFER_MIN) && newEnd > (existingStart - BUFFER_MIN)) {
                return NextResponse.json({
                    error: "Impossible : Vous avez une autre visite trop proche (1h30 de délai requis entre deux visites).",
                    code: "TRAVEL_CONFLICT"
                }, { status: 409 });
            }
        }
        // ---------------------------------

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

        // Update invitation message
        const { conversationId } = body;
        if (conversationId) {
            const lastInvitation = await prisma.message.findFirst({
                where: {
                    conversationId,
                    body: 'INVITATION_VISITE'
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            if (lastInvitation) {
                const updatedBody = `VISIT_CONFIRMED|${visit.date.toISOString()}|${visit.startTime}`;
                await prisma.message.update({
                    where: { id: lastInvitation.id },
                    data: { body: updatedBody }
                });
            }
            revalidatePath(`/inbox/${conversationId}`);
        }

        // Get landlord ID and broadcast the new visit
        const listingWithOwner = await prisma.listing.findUnique({
            where: { id: listingId },
            include: {
                rentalUnit: {
                    include: {
                        property: true
                    }
                }
            }
        });

        const landlordId = listingWithOwner?.rentalUnit?.property?.ownerId;
        if (landlordId) {
            await broadcastNewVisit(landlordId, {
                id: visit.id,
                date: visit.date,
                startTime: visit.startTime,
                listingId: visit.listingId
            });
        }

        return NextResponse.json(visit);
    } catch (error) {
        console.error("Booking Error:", error);
        return NextResponse.json({ error: "Booking Failed" }, { status: 500 });
    }
}
