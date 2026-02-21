import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import { createNotification } from '@/libs/notifications';
import { sendPushNotification } from '@/app/lib/sendPushNotification';

type Params = { params: Promise<{ inspectionId: string; amendmentId: string }> };

// PATCH /api/inspection/[inspectionId]/amendments/[amendmentId] — Respond to amendment
export async function PATCH(request: Request, props: Params) {
  try {
    const { inspectionId, amendmentId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status, responseNote } = body; // status: 'ACCEPTED' | 'REJECTED'

    if (!status || !['ACCEPTED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: {
        tenant: { select: { id: true, name: true } },
        application: { select: { listingId: true } },
      },
    });

    if (!inspection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Only landlord can respond
    if (inspection.landlordId !== currentUser.id) {
      return NextResponse.json({ error: 'Only the landlord can respond' }, { status: 403 });
    }

    const amendment = await prisma.inspectionAmendment.findUnique({
      where: { id: amendmentId },
    });

    if (!amendment || amendment.inspectionId !== inspectionId) {
      return NextResponse.json({ error: 'Amendment not found' }, { status: 404 });
    }

    if (amendment.status !== 'PENDING') {
      return NextResponse.json({ error: 'Already responded' }, { status: 409 });
    }

    // Update amendment
    const updated = await prisma.inspectionAmendment.update({
      where: { id: amendmentId },
      data: {
        status,
        responseNote: responseNote?.trim() || null,
        respondedAt: new Date(),
      },
    });

    // System message in conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        listingId: inspection.application.listingId,
        users: { some: { id: currentUser.id } },
      },
    });

    const statusLabel = status === 'ACCEPTED' ? 'acceptée' : 'refusée';

    if (conversation) {
      await prisma.message.create({
        data: {
          body: `INSPECTION_AMENDMENT_RESPONDED|${inspectionId}|${amendmentId}|${status}|${amendment.description.substring(0, 60)}`,
          conversation: { connect: { id: conversation.id } },
          sender: { connect: { id: currentUser.id } },
          seen: { connect: { id: currentUser.id } },
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });
    }

    // Notify tenant
    if (inspection.tenantId) {
      await createNotification({
        userId: inspection.tenantId,
        type: 'inspection',
        title: `Rectification ${statusLabel}`,
        message: `Votre demande de rectification a été ${statusLabel}${responseNote ? ` : "${responseNote.trim().substring(0, 80)}"` : ''}.`,
        link: `/inspection/${inspectionId}/done`,
      });

      sendPushNotification({
        userId: inspection.tenantId,
        title: `Rectification ${statusLabel}`,
        body: `Votre demande a été ${statusLabel}.`,
        url: `/inspection/${inspectionId}/done`,
      }).catch(err => console.error("[Push] Failed:", err));
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('[Amendment PATCH] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
