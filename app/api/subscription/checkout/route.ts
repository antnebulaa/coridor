import { NextResponse } from 'next/server';
import getCurrentUser from '@/app/actions/getCurrentUser';
import { SubscriptionService } from '@/services/SubscriptionService';

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId, billingCycle } = await request.json();

    if (!planId || !billingCycle) {
      return NextResponse.json({ error: 'Missing planId or billingCycle' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const url = await SubscriptionService.createCheckoutSession({
      userId: currentUser.id,
      userEmail: currentUser.email!,
      planId,
      billingCycle,
      successUrl: `${baseUrl}/account/subscription?success=true`,
      cancelUrl: `${baseUrl}/pricing?cancelled=true`,
    });

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('[Checkout] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
