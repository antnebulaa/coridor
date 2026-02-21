import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import { createNotification } from '@/libs/notifications';
import { sendPushNotification } from '@/app/lib/sendPushNotification';

type Params = { params: Promise<{ inspectionId: string }> };

// POST /api/inspection/[inspectionId]/cancel — Cancel a scheduled EDL
export async function POST(request: Request, props: Params) {
  try {
    const { inspectionId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: {
        landlord: { select: { id: true, name: true } },
        tenant: { select: { id: true, name: true } },
        application: {
          select: {
            listingId: true,
            listing: {
              select: {
                title: true,
                rentalUnit: {
                  select: {
                    property: {
                      select: { ownerId: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!inspection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Only landlord can cancel
    if (inspection.landlordId !== currentUser.id) {
      return NextResponse.json({ error: 'Only the landlord can cancel' }, { status: 403 });
    }

    // Can only cancel DRAFT inspections
    if (inspection.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Can only cancel draft inspections' }, { status: 400 });
    }

    // Update inspection
    await prisma.inspection.update({
      where: { id: inspectionId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    // System message in conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        listingId: inspection.application.listingId,
        users: { some: { id: currentUser.id } },
      },
    });

    const typeLabel = inspection.type === 'ENTRY' ? "d'entrée" : 'de sortie';

    if (conversation) {
      await prisma.message.create({
        data: {
          body: `INSPECTION_CANCELLED|${inspectionId}|${inspection.type}`,
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
      const landlordName = inspection.landlord?.name || 'Le propriétaire';

      await createNotification({
        userId: inspection.tenantId,
        type: 'inspection',
        title: "État des lieux annulé",
        message: `${landlordName} a annulé l'état des lieux ${typeLabel}.`,
        link: `/inbox`,
      });

      sendPushNotification({
        userId: inspection.tenantId,
        title: "État des lieux annulé",
        body: `${landlordName} a annulé l'état des lieux ${typeLabel}.`,
        url: `/inbox`,
      }).catch(err => console.error("[Push] Failed:", err));
    }

    return NextResponse.json({ cancelled: true });
  } catch (error: unknown) {
    console.error('[Inspection Cancel POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
