import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

export async function GET(
    request: Request,
    props: { params: Promise<{ userId: string }> }
) {
    const params = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = params;

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                tenantProfile: {
                    include: {
                        guarantors: true,
                        additionalIncomes: true,
                    },
                },
                properties: {
                    include: {
                        rentalUnits: {
                            include: {
                                listings: {
                                    select: {
                                        id: true,
                                        title: true,
                                        status: true,
                                        price: true,
                                        createdAt: true,
                                        updatedAt: true,
                                        isPublished: true,
                                    },
                                },
                            },
                        },
                        images: true,
                    },
                },
                subscriptions: {
                    orderBy: { startDate: "desc" },
                },
                createdScopes: {
                    include: {
                        applications: {
                            select: {
                                id: true,
                                status: true,
                                appliedAt: true,
                                rejectedAt: true,
                                leaseStatus: true,
                                listingId: true,
                                listing: {
                                    select: {
                                        title: true,
                                        rentalUnit: {
                                            select: {
                                                property: {
                                                    select: { city: true },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Get activity stats in parallel
        const [messageCount, visitCount, reportsMade, reportsReceived, latestMessage] =
            await Promise.all([
                prisma.message.count({
                    where: { senderId: userId },
                }),
                prisma.visit.count({
                    where: { candidateId: userId },
                }),
                prisma.report.count({
                    where: { reporterId: userId },
                }),
                prisma.report.count({
                    where: { targetUserId: userId },
                }),
                prisma.message.findFirst({
                    where: { senderId: userId },
                    orderBy: { createdAt: "desc" },
                    select: { createdAt: true },
                }),
            ]);

        // Build current subscription (latest active/gifted one)
        const currentSubscription =
            user.subscriptions.find(
                (s) => s.status === "ACTIVE" || s.status === "GIFTED"
            ) || null;

        // Serialize dates
        const serializedSubscriptions = user.subscriptions.map((s) => ({
            id: s.id,
            plan: s.plan,
            status: s.status,
            startDate: s.startDate.toISOString(),
            endDate: s.endDate?.toISOString() || null,
            isGifted: s.isGifted,
            giftedById: s.giftedById,
            giftReason: s.giftReason,
            createdAt: s.createdAt.toISOString(),
            updatedAt: s.updatedAt.toISOString(),
        }));

        const serializedProperties = user.properties.map((p) => ({
            id: p.id,
            category: p.category,
            address: p.address,
            city: p.city,
            zipCode: p.zipCode,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
            images: p.images,
            rentalUnits: p.rentalUnits.map((ru) => ({
                id: ru.id,
                name: ru.name,
                type: ru.type,
                isActive: ru.isActive,
                surface: ru.surface,
                listings: ru.listings.map((l) => ({
                    id: l.id,
                    title: l.title,
                    status: l.status,
                    price: l.price,
                    isPublished: l.isPublished,
                    createdAt: l.createdAt.toISOString(),
                    updatedAt: l.updatedAt.toISOString(),
                })),
            })),
        }));

        const serializedScopes = user.createdScopes.map((scope) => ({
            id: scope.id,
            compositionType: scope.compositionType,
            targetLeaseType: scope.targetLeaseType,
            childCount: scope.childCount,
            targetMoveInDate: scope.targetMoveInDate?.toISOString() || null,
            createdAt: scope.createdAt.toISOString(),
            applications: scope.applications.map((app) => ({
                id: app.id,
                status: app.status,
                appliedAt: app.appliedAt.toISOString(),
                rejectedAt: app.rejectedAt?.toISOString() || null,
                leaseStatus: app.leaseStatus,
                listingId: app.listingId,
                listingTitle: app.listing?.title || null,
                listingCity:
                    app.listing?.rentalUnit?.property?.city || null,
            })),
        }));

        const lastActivity = latestMessage
            ? latestMessage.createdAt.toISOString()
            : user.createdAt.toISOString();

        return NextResponse.json({
            // User identity
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            address: user.address,
            addressLine1: user.addressLine1,
            building: user.building,
            apartment: user.apartment,
            city: user.city,
            zipCode: user.zipCode,
            country: user.country,
            birthDate: user.birthDate?.toISOString() || null,
            birthPlace: user.birthPlace,
            role: user.role,
            userMode: user.userMode,
            plan: user.plan,
            isBanned: user.isBanned,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),

            // Subscription
            currentSubscription: currentSubscription
                ? {
                      id: currentSubscription.id,
                      plan: currentSubscription.plan,
                      status: currentSubscription.status,
                      startDate: currentSubscription.startDate.toISOString(),
                      endDate:
                          currentSubscription.endDate?.toISOString() || null,
                      isGifted: currentSubscription.isGifted,
                      giftedById: currentSubscription.giftedById,
                      giftReason: currentSubscription.giftReason,
                  }
                : null,
            subscriptionHistory: serializedSubscriptions,

            // Properties & Listings
            properties: serializedProperties,

            // Tenant profile
            tenantProfile: user.tenantProfile,

            // Applications (via TenantCandidateScopes)
            candidateScopes: serializedScopes,

            // Activity stats
            activityStats: {
                messageCount,
                visitCount,
                reportsMade,
                reportsReceived,
            },

            // Last activity
            lastActivity,
        });
    } catch (error) {
        console.error("Error in GET /api/admin/users/[userId]/detail", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
