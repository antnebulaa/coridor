import { NextResponse } from 'next/server';
import getCurrentUser from '@/app/actions/getCurrentUser';
import { SubscriptionService } from '@/services/SubscriptionService';

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const url = await SubscriptionService.createPortalSession(
      currentUser.id,
      `${baseUrl}/account/subscription`
    );

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('[Portal] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
