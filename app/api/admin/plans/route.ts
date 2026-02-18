import { NextResponse } from 'next/server';
import getCurrentUser from '@/app/actions/getCurrentUser';
import prisma from '@/libs/prismadb';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const plans = await prisma.subscriptionPlan.findMany({
      include: {
        planFeatures: {
          include: { feature: true },
        },
        _count: { select: { userSubscriptions: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Map SubscriptionPlan.name → legacy User.plan values
    const legacyPlanMap: Record<string, string[]> = {
      FREE: ['FREE'],
      ESSENTIAL: ['PLUS'],  // Legacy PLUS = new ESSENTIAL
      PRO: ['PRO'],
    };

    // Count users by legacy plan field (includes gifted/trial subscriptions)
    const enriched = await Promise.all(
      plans.map(async (plan) => {
        const legacyPlanValues = legacyPlanMap[plan.name] || [];
        const legacyUserCount = legacyPlanValues.length > 0
          ? await prisma.user.count({
              where: { plan: { in: legacyPlanValues as any } },
            })
          : 0;

        return {
          ...plan,
          _count: {
            ...plan._count,
            // Total = new system + legacy users not yet in new system
            totalSubscribers: Math.max(plan._count.userSubscriptions, legacyUserCount),
          },
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, displayName, description, monthlyPriceCents, yearlyPriceCents, maxProperties, stripePriceIdMonthly, stripePriceIdYearly, isPopular, isActive, sortOrder, featureIds } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing plan id' }, { status: 400 });
    }

    // Update plan fields
    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (description !== undefined) updateData.description = description;
    if (monthlyPriceCents !== undefined) updateData.monthlyPriceCents = monthlyPriceCents;
    if (yearlyPriceCents !== undefined) updateData.yearlyPriceCents = yearlyPriceCents;
    if (maxProperties !== undefined) updateData.maxProperties = maxProperties;
    if (stripePriceIdMonthly !== undefined) updateData.stripePriceIdMonthly = stripePriceIdMonthly;
    if (stripePriceIdYearly !== undefined) updateData.stripePriceIdYearly = stripePriceIdYearly;
    if (isPopular !== undefined) updateData.isPopular = isPopular;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const plan = await prisma.subscriptionPlan.update({
      where: { id },
      data: updateData,
    });

    // Update features if provided
    if (featureIds !== undefined) {
      // Remove old associations
      await prisma.planFeature.deleteMany({ where: { planId: id } });
      // Create new ones
      for (const featureId of featureIds) {
        await prisma.planFeature.create({
          data: { planId: id, featureId },
        });
      }
    }

    return NextResponse.json(plan);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
