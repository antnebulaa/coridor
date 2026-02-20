import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

export default async function getActiveRental() {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return null;
        }

        // Find the active lease (SIGNED or PENDING_SIGNATURE) where current user is a tenant
        const application = await prisma.rentalApplication.findFirst({
            where: {
                leaseStatus: { in: ['SIGNED', 'PENDING_SIGNATURE'] },
                candidateScope: {
                    OR: [
                        { creatorUserId: currentUser.id },
                        { membersIds: { has: currentUser.id } }
                    ]
                }
            },
            include: {
                listing: {
                    include: {
                        rentalUnit: {
                            include: {
                                property: {
                                    include: {
                                        owner: {
                                            select: {
                                                id: true,
                                                name: true,
                                                firstName: true,
                                                lastName: true,
                                                image: true,
                                            }
                                        },
                                        images: {
                                            take: 1,
                                            orderBy: { order: 'asc' }
                                        }
                                    }
                                }
                            }
                        },
                        conversations: {
                            where: {
                                users: { some: { id: currentUser.id } }
                            },
                            select: { id: true },
                            take: 1
                        }
                    }
                },
                financials: {
                    where: { endDate: null },
                    take: 1
                },
                rentPaymentTrackings: {
                    orderBy: [
                        { periodYear: 'desc' },
                        { periodMonth: 'desc' }
                    ],
                    take: 6
                },
                rentReceipts: {
                    orderBy: { periodStart: 'desc' },
                    take: 1
                }
            },
            orderBy: {
                appliedAt: 'desc'
            }
        });

        if (!application) {
            return null;
        }

        const listing = application.listing;
        const unit = listing.rentalUnit;
        const property = unit.property;
        const financials = application.financials[0] || null;
        const landlord = property.owner;
        const conversationId = listing.conversations[0]?.id || null;

        // Compute next rent date
        const now = new Date();
        const paymentDay = listing.paymentDay || 1;
        let nextRentDate: Date;
        if (now.getDate() < paymentDay) {
            nextRentDate = new Date(now.getFullYear(), now.getMonth(), paymentDay);
        } else {
            nextRentDate = new Date(now.getFullYear(), now.getMonth() + 1, paymentDay);
        }

        // Total rent (base + charges)
        const baseRentCents = financials?.baseRentCents || listing.price || 0;
        const chargesCents = financials?.serviceChargesCents || listing.chargesAmount || 0;
        const totalRentCents = baseRentCents + chargesCents;

        // Fallback: if leaseStartDate is null, use financials.startDate
        const leaseStartDate = application.leaseStartDate || financials?.startDate || null;
        // Fallback: compute leaseEndDate from start + duration if missing
        let leaseEndDate = application.leaseEndDate;
        if (!leaseEndDate && leaseStartDate && application.leaseDurationMonths) {
            leaseEndDate = new Date(leaseStartDate);
            leaseEndDate.setMonth(leaseEndDate.getMonth() + application.leaseDurationMonths);
        }

        return {
            applicationId: application.id,
            leaseStatus: application.leaseStatus,
            signedLeaseUrl: application.signedLeaseUrl,
            leaseStartDate: leaseStartDate instanceof Date ? leaseStartDate.toISOString() : leaseStartDate ? new Date(leaseStartDate).toISOString() : null,
            leaseEndDate: leaseEndDate instanceof Date ? leaseEndDate.toISOString() : leaseEndDate ? new Date(leaseEndDate).toISOString() : null,
            leaseDurationMonths: application.leaseDurationMonths,

            // Property info
            property: {
                category: property.category || 'apartment',
                address: property.address || '',
                city: property.city || '',
                zipCode: property.zipCode || '',
                totalSurface: unit.surface || property.totalSurface || null,
                floor: property.floor,
                totalFloors: property.totalFloors,
                hasElevator: property.hasElevator,
                heatingSystem: property.heatingSystem,
                dpe: property.dpe,
                photo: property.images[0]?.url || null,
                hasDigicode: property.hasDigicode,
                digicodeValue: property.digicodeValue,
                electricMeterPDL: property.electricMeterPDL,
            },

            // Listing info
            listing: {
                id: listing.id,
                title: listing.title,
                securityDeposit: listing.securityDeposit || 0,
                chargesType: listing.chargesType,
                paymentDay: listing.paymentDay || 1,
                paymentMethod: listing.paymentMethod,
            },

            // Financials
            baseRentCents,
            chargesCents,
            totalRentCents,
            nextRentDate: nextRentDate.toISOString(),

            // Landlord
            landlord: {
                id: landlord.id,
                name: landlord.name || `${landlord.firstName || ''} ${landlord.lastName || ''}`.trim(),
                firstName: landlord.firstName,
                lastName: landlord.lastName,
                image: landlord.image,
            },
            conversationId,

            // Payments (last 6)
            payments: application.rentPaymentTrackings.map(p => ({
                id: p.id,
                periodMonth: p.periodMonth,
                periodYear: p.periodYear,
                expectedAmountCents: p.expectedAmountCents,
                detectedAmountCents: p.detectedAmountCents,
                status: p.status,
                expectedDate: p.expectedDate.toISOString(),
            })),

            // Last receipt
            lastReceipt: application.rentReceipts[0] ? {
                id: application.rentReceipts[0].id,
                periodStart: application.rentReceipts[0].periodStart.toISOString(),
                periodEnd: application.rentReceipts[0].periodEnd.toISOString(),
                pdfUrl: application.rentReceipts[0].pdfUrl,
            } : null,
        };
    } catch (error: any) {
        console.error("Error fetching active rental:", error);
        return null;
    }
}
