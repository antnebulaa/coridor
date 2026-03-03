import { NextResponse } from 'next/server';
import getCurrentUser from '@/app/actions/getCurrentUser';
import prisma from '@/libs/prismadb';

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token, platform } = await request.json();

    if (!token || !platform) {
      return NextResponse.json({ error: 'Missing token or platform' }, { status: 400 });
    }

    await prisma.pushToken.upsert({
      where: {
        userId_platform: {
          userId: currentUser.id,
          platform,
        },
      },
      update: { token, updatedAt: new Date() },
      create: {
        userId: currentUser.id,
        token,
        platform,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API push/register] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
