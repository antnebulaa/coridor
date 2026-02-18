import { NextResponse } from 'next/server';
import getCurrentUser from '@/app/actions/getCurrentUser';
import { getUserFeatures } from '@/lib/features';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await getUserFeatures(currentUser.id);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Subscription Status] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
