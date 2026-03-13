import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

export default async function getLandlordCalendarData() {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return null;
        }

        // All 6 queries are independent — run them in parallel
        const [visitSlots, properties, visits, inspections, rentTracking, reminders] = await Promise.all([
            // 1. Fetch Availability Slots (User Centric)
            prisma.visitSlot.findMany({
                where: {
                    userId: currentUser.id
                }
            }),

            // 2. Fetch Properties (Context for bookings)
            prisma.property.findMany({
                where: {
                    ownerId: currentUser.id
                },
                include: {
                    rentalUnits: {
                        include: {
                            listings: {
                                select: {
                                    id: true,
                                    title: true,
                                    propertyAdjective: true,
                                    rentalUnit: {
                                        select: {
                                            name: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }),

            // 3. Fetch Scheduled Visits (Bookings)
            prisma.visit.findMany({
                where: {
                    listing: {
                        rentalUnit: {
                            property: {
                                ownerId: currentUser.id
                            }
                        }
                    }
                },
                include: {
                    listing: {
                        select: {
                            id: true,
                            title: true,
                            price: true,
                            charges: true,
                            propertyAdjective: true,
                            leaseType: true,
                            availableFrom: true,
                            rentalUnit: {
                                select: {
                                    property: {
                                        select: {
                                            category: true,
                                            city: true,
                                            address: true,
                                            addressLine1: true
                                        }
                                    }
                                }
                            }
                        }
                    },
                    candidate: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                            email: true,
                            createdScopes: {
                                take: 1,
                                orderBy: { createdAt: 'desc' }
                            },
                            tenantProfile: {
                                include: {
                                    guarantors: {
                                        include: {
                                            additionalIncomes: true
                                        }
                                    },
                                    additionalIncomes: true
                                }
                            },
                            conversations: {
                                where: {
                                    users: {
                                        some: {
                                            id: currentUser.id
                                        }
                                    }
                                },
                                take: 1,
                                select: {
                                    id: true
                                }
                            }
                        }
                    },
                    evaluation: {
                        include: {
                            scores: true
                        }
                    }
                }
            }),

            // 4. Fetch Inspections (EDL events)
            prisma.inspection.findMany({
                where: {
                    landlordId: currentUser.id,
                    status: { in: ['DRAFT', 'PENDING_SIGNATURE', 'SIGNED'] },
                },
                select: {
                    id: true,
                    type: true,
                    status: true,
                    scheduledAt: true,
                    startedAt: true,
                    completedAt: true,
                    createdAt: true,
                    tenant: { select: { name: true } },
                    application: {
                        select: {
                            listing: {
                                select: {
                                    title: true,
                                    rentalUnit: {
                                        select: {
                                            property: {
                                                select: {
                                                    city: true,
                                                    address: true,
                                                    addressLine1: true,
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    rooms: { select: { isCompleted: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),

            // 5. Fetch Rent Payment Tracking
            prisma.rentPaymentTracking.findMany({
                where: {
                    rentalApplication: {
                        listing: {
                            rentalUnit: {
                                property: { ownerId: currentUser.id }
                            }
                        }
                    }
                },
                select: {
                    id: true,
                    periodMonth: true,
                    periodYear: true,
                    status: true,
                    expectedAmountCents: true,
                    expectedDate: true,
                    rentalApplication: {
                        select: {
                            listing: { select: { title: true } },
                            candidateScope: {
                                select: {
                                    creatorUser: { select: { name: true } }
                                }
                            }
                        }
                    }
                },
                orderBy: { expectedDate: 'asc' }
            }),

            // 6. Fetch Legal Reminders (CRITICAL + HIGH priority only)
            prisma.legalReminder.findMany({
                where: {
                    userId: currentUser.id,
                    priority: { in: ['CRITICAL', 'HIGH'] },
                    status: { not: 'COMPLETED' }
                },
                select: {
                    id: true,
                    type: true,
                    title: true,
                    priority: true,
                    status: true,
                    dueDate: true,
                    property: {
                        select: {
                            rentalUnits: {
                                take: 1,
                                select: {
                                    listings: {
                                        take: 1,
                                        select: { title: true }
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: { dueDate: 'asc' }
            }),
        ]);

        // Serialization
        const safeSlots = visitSlots.map((slot: any) => ({
            ...slot,
            date: slot.date.toISOString()
        }));

        const safeProperties = properties.map((prop: any) => ({
            ...prop,
            createdAt: prop.createdAt.toISOString(),
            updatedAt: prop.updatedAt.toISOString(),
        }));

        const safeInspections = inspections.map((insp: any) => {
            const eventDate = insp.scheduledAt || insp.startedAt || insp.createdAt;
            const date = new Date(eventDate);
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const startTime = `${hours}:${minutes}`;
            // Default 1.5h duration
            const endDate = new Date(date.getTime() + 90 * 60 * 1000);
            const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

            return {
                id: insp.id,
                type: insp.type, // ENTRY | EXIT
                status: insp.status,
                date: eventDate.toISOString(),
                startTime,
                endTime,
                tenantName: insp.tenant?.name || null,
                listingTitle: insp.application.listing.title || 'Logement',
                address: insp.application.listing.rentalUnit.property.address
                    || insp.application.listing.rentalUnit.property.addressLine1
                    || insp.application.listing.rentalUnit.property.city
                    || null,
                totalRooms: insp.rooms.length,
                completedRooms: insp.rooms.filter((r: any) => r.isCompleted).length,
            };
        });

        const safeVisits = visits.map((visit: any) => ({
            ...visit,
            date: visit.date.toISOString(),
            createdAt: visit.createdAt.toISOString(),
            listing: {
                ...visit.listing,
                category: visit.listing.rentalUnit.property.category || 'Logement',
                city: visit.listing.rentalUnit.property.city,
                address: visit.listing.rentalUnit.property.address || visit.listing.rentalUnit.property.addressLine1 || null,
                availableFrom: visit.listing.availableFrom?.toISOString() || null,
            },
            candidate: {
                ...visit.candidate,
                conversationId: visit.candidate.conversations?.[0]?.id || null,
                tenantProfile: visit.candidate.tenantProfile,
                candidateScope: visit.candidate.createdScopes?.[0] || null
            },
            evaluation: visit.evaluation ? {
                id: visit.evaluation.id,
                decision: visit.evaluation.decision,
                compositeScore: visit.evaluation.compositeScore,
                scores: visit.evaluation.scores || []
            } : null
        }));

        const safeRentTracking = rentTracking.map((rt: any) => ({
            id: rt.id,
            month: rt.periodMonth,
            year: rt.periodYear,
            status: rt.status,
            amountCents: rt.expectedAmountCents,
            dueDate: rt.expectedDate?.toISOString() || null,
            propertyTitle: rt.rentalApplication?.listing?.title || 'Logement',
            tenantName: rt.rentalApplication?.candidateScope?.creatorUser?.name || null,
        }));

        const safeReminders = reminders.map((r: any) => ({
            id: r.id,
            type: r.type,
            title: r.title,
            priority: r.priority,
            status: r.status,
            dueDate: r.dueDate?.toISOString() || null,
            propertyTitle: r.property?.rentalUnits?.[0]?.listings?.[0]?.title || null,
        }));

        return {
            slots: safeSlots,
            properties: safeProperties,
            visits: safeVisits,
            inspections: safeInspections,
            rentTracking: safeRentTracking,
            reminders: safeReminders,
        };

    } catch (error: any) {
        console.error("GET_CALENDAR_DATA_ERROR", error);
        return null;
    }
}
