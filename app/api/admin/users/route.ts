import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);

        // Parse query params
        const search = searchParams.get("search") || undefined;
        const plan = searchParams.get("plan") || undefined;
        const status = searchParams.get("status") || undefined; // "active" | "banned" | "all"
        const mode = searchParams.get("mode") || undefined; // "LANDLORD" | "TENANT"
        const sort = searchParams.get("sort") || searchParams.get("sortBy") || "createdAt";
        const order = (searchParams.get("order") || searchParams.get("sortOrder") || "desc") as "asc" | "desc";
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || searchParams.get("perPage") || "25", 10)));

        // Build where clause
        const where: Prisma.UserWhereInput = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
            ];
        }

        if (plan && ["FREE", "PLUS", "PRO"].includes(plan)) {
            where.plan = plan as "FREE" | "PLUS" | "PRO";
        }

        if (status === "banned") {
            where.isBanned = true;
        } else if (status === "active") {
            where.isBanned = false;
        }
        // "all" or undefined means no filter

        if (mode && ["LANDLORD", "TENANT"].includes(mode)) {
            where.userMode = mode as "LANDLORD" | "TENANT";
        }

        // Build orderBy
        const validSortFields: Record<string, Prisma.UserOrderByWithRelationInput> = {
            name: { name: order },
            createdAt: { createdAt: order },
            plan: { plan: order },
            email: { email: order },
        };
        const orderBy = validSortFields[sort] || validSortFields.createdAt;

        // Execute count and query in parallel
        const [total, users] = await Promise.all([
            prisma.user.count({ where }),
            prisma.user.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    properties: {
                        include: {
                            rentalUnits: {
                                include: {
                                    listings: {
                                        select: {
                                            id: true,
                                            status: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    createdScopes: {
                        include: {
                            _count: {
                                select: { applications: true },
                            },
                        },
                    },
                    subscriptions: {
                        orderBy: { startDate: "desc" },
                        take: 1,
                    },
                },
            }),
        ]);

        const totalPages = Math.ceil(total / limit);

        const enrichedUsers = users.map((user) => {
            // Count properties
            const propertyCount = user.properties.length;

            // Count all listings
            let listingCount = 0;
            for (const property of user.properties) {
                for (const unit of property.rentalUnits) {
                    listingCount += unit.listings.length;
                }
            }

            // Count applications (via TenantCandidateScope)
            let applicationCount = 0;
            for (const scope of user.createdScopes) {
                applicationCount += scope._count.applications;
            }

            // Latest subscription
            const latestSub = user.subscriptions[0] || null;

            return {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
                role: user.role,
                userMode: user.userMode,
                plan: user.plan,
                isBanned: user.isBanned,
                createdAt: user.createdAt.toISOString(),
                propertyCount,
                listingCount,
                applicationCount,
                subscription: latestSub
                    ? {
                          status: latestSub.status,
                          endDate: latestSub.endDate?.toISOString() || null,
                          isGifted: latestSub.isGifted,
                      }
                    : null,
            };
        });

        return NextResponse.json({
            users: enrichedUsers,
            total,
            page,
            totalPages,
        });
    } catch (error) {
        console.error("Error in GET /api/admin/users", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
