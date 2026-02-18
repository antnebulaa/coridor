import { NextResponse } from 'next/server';
import getCurrentUser from '@/app/actions/getCurrentUser';
import prisma from '@/libs/prismadb';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const features = await prisma.feature.findMany({
      orderBy: [{ category: 'asc' }, { label: 'asc' }],
    });

    return NextResponse.json(features);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
