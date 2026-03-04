import { NextResponse } from 'next/server';
import getCurrentUser from '@/app/actions/getCurrentUser';
import PseudonymService from '@/services/PseudonymService';
import prisma from '@/libs/prismadb';

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Si candidature active → bloquer la modification du pseudo
    const activeApplication = await prisma.rentalApplication.findFirst({
      where: {
        candidateScope: { creatorUserId: currentUser.id },
        status: { notIn: ['REJECTED'] },
      },
    });

    if (activeApplication) {
      return NextResponse.json(
        { error: 'ACTIVE_APPLICATION_EXISTS' },
        { status: 409 }
      );
    }

    // Accept optional pseudonym from body (client-generated preview)
    let body: { emoji?: string; text?: string; full?: string; pattern?: string } = {};
    try {
      body = await request.json();
    } catch {
      // No body — will generate server-side
    }

    if (body.emoji && body.text && body.full) {
      // Save the client-provided pseudonym
      await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          pseudonymEmoji: body.emoji,
          pseudonymText: body.text,
          pseudonymFull: body.full,
          pseudonymPattern: body.pattern || 'A',
        },
      });

      return NextResponse.json({
        emoji: body.emoji,
        text: body.text,
        full: body.full,
      });
    }

    // No body — generate server-side
    const pseudonym = await PseudonymService.generateAndAssign(currentUser.id);

    return NextResponse.json({
      emoji: pseudonym.emoji,
      text: pseudonym.text,
      full: pseudonym.full,
    });
  } catch (error: unknown) {
    console.error('[PSEUDONYM_GENERATE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
