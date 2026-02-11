
import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

export async function POST(
    request: Request,
    props: { params: Promise<{ listingId: string }> }
) {
    const params = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== 'ADMIN') {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const listing = await prisma.listing.update({
            where: {
                id: params.listingId,
            },
            data: {
                status: 'PUBLISHED',
                isPublished: true,
                reviewedAt: new Date(),
                reviewedBy: currentUser.id,
                rejectionReason: null // Clear any previous rejection
            }
        });

        // Fetch full listing details for alerts
        const fullListing = await prisma.listing.findUnique({
            where: { id: listing.id },
            include: {
                rentalUnit: {
                    include: {
                        property: true
                    }
                }
            }
        });

        if (fullListing && fullListing.rentalUnit && fullListing.rentalUnit.property) {
            try {
                const chargesRaw: any = fullListing.charges;
                const price = fullListing.price + (chargesRaw?.amount || 0);
                // Use listing.roomCount (target constraints) or fallback to rentalUnit logic if needed, 
                // but Listing.roomCount is what's used for filtering.
                // If Listing.roomCount is null, we might check Property.rooms? 
                // Let's assume Listing.roomCount is populated if relevant.
                const roomCount = fullListing.roomCount || 0;

                const p = fullListing.rentalUnit.property;
                const locationString = [p.city, p.zipCode, p.country, p.neighborhood, p.district].filter(Boolean).join(' ').toLowerCase();

                const matchingAlerts = await (prisma as any).searchAlert.findMany({
                    where: {
                        OR: [
                            { category: null },
                            { category: p.category }
                        ],
                        AND: [
                            { OR: [{ minPrice: null }, { minPrice: { lte: price } }] },
                            { OR: [{ maxPrice: null }, { maxPrice: { gte: price } }] },
                            { OR: [{ roomCount: null }, { roomCount: { lte: roomCount } }] }
                        ]
                    },
                    include: { user: true }
                });

                const finalAlerts = matchingAlerts.filter((alert: any) => {
                    if (!alert.locationValue) return true;
                    // Check if listing location string contains the alert location (e.g. "Paris")
                    return locationString.includes(alert.locationValue.toLowerCase());
                });

                if (finalAlerts.length > 0) {
                    const { sendEmail } = await import('@/lib/email');
                    await Promise.all(finalAlerts.map(async (alert: any) => {
                        const email = alert.email || alert.user.email;
                        if (!email) return;

                        const subject = `Nouvelle annonce : ${fullListing.title}`;
                        const { EmailTemplate } = await import('@/components/emails/EmailTemplate');

                        return sendEmail(
                            email,
                            subject,
                            <EmailTemplate
                                heading="Nouvelle annonce pour vous !"
                                previewText = {`Une annonce correspond à votre recherche : ${fullListing.title}`}
                                actionLabel = "Voir l'annonce"
                                actionUrl = {`${process.env.NEXT_PUBLIC_APP_URL}/listings/${fullListing.id}`}
                            >
                    <p>Une annonce correspond à vos critères de recherche: </p>
                        < div style = {{
                    padding: '20px',
                        border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                                marginTop: '16px',
                                    marginBottom: '16px',
                                        backgroundColor: '#ffffff'
                }
            }>
                <h3 style={ { margin: '0 0 8px', fontSize: '18px', fontWeight: '600' } }> { fullListing.title } </h3>
                    < p style = {{ margin: '0 0 4px', fontSize: '16px', fontWeight: 'bold', color: '#000000' }
        }>
            { price }€ <span style={ { fontSize: '14px', fontWeight: 'normal', color: '#666666' } }> / mois CC</span >
                </p>
                < p style = {{ margin: 0, color: '#666666' }
    }>
        { p.city || p.address }
        </p>
        </div>
        </EmailTemplate>
                        );
}));
                }
            } catch (e) {
    console.error("Alert error", e);
}
        }

// Send notification to owner that listing is published
const { createNotification } = await import('@/libs/notifications');
await createNotification({
    userId: fullListing?.rentalUnit?.property?.ownerId || '',
    type: 'LISTING_APPROVED',
    title: 'Annonce publiée !',
    message: `Votre annonce "${listing.title}" a été approuvée et est maintenant visible.`,
    link: `/listings/${listing.id}`
});

return NextResponse.json(listing);

    } catch (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
}
