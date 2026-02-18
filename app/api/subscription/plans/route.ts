import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';

export async function GET() {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      include: {
        planFeatures: {
          include: { feature: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const formatted = plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description,
      monthlyPriceCents: plan.monthlyPriceCents,
      yearlyPriceCents: plan.yearlyPriceCents,
      maxProperties: plan.maxProperties,
      isPopular: plan.isPopular,
      features: plan.planFeatures.map((pf) => ({
        key: pf.feature.key,
        label: pf.feature.label,
        category: pf.feature.category,
      })),
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('[Plans] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
