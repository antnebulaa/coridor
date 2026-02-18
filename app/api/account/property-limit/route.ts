import { NextResponse } from 'next/server';
import getCurrentUser from '@/app/actions/getCurrentUser';
import prisma from '@/libs/prismadb';
import { getMaxProperties } from '@/lib/features';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const propertyCount = await prisma.property.count({
      where: { ownerId: currentUser.id },
    });

    const maxProperties = await getMaxProperties(currentUser.id);

    return NextResponse.json({
      propertyCount,
      maxProperties,
      canCreate: propertyCount < maxProperties,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
