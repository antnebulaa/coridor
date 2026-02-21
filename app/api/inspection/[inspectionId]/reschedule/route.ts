import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import { createNotification } from '@/libs/notifications';
import { sendPushNotification } from '@/app/lib/sendPushNotification';

type Params = { params: Promise<{ inspectionId: string }> };

// POST /api/inspection/[inspectionId]/reschedule — Reschedule a planned EDL
export async function POST(request: Request, props: Params) {
  try {
    const { inspectionId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { scheduledAt } = body;

    if (!scheduledAt) {
      return NextResponse.json({ error: 'scheduledAt is required' }, { status: 400 });
    }

    const newDate = new Date(scheduledAt);
    if (newDate <= new Date()) {
      return NextResponse.json({ error: 'New date must be in the future' }, { status: 400 });
    }

    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: {
        landlord: { select: { id: true, name: true } },
        tenant: { select: { id: true, name: true } },
        application: {
          select: {
            listingId: true,
          },
        },
      },
    });

    if (!inspection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Only landlord can reschedule
    if (inspection.landlordId !== currentUser.id) {
      return NextResponse.json({ error: 'Only the landlord can reschedule' }, { status: 403 });
    }

    // Can only reschedule DRAFT inspections
    if (inspection.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Can only reschedule draft inspections' }, { status: 400 });
    }

    // Update inspection — reset tenant confirmation
    await prisma.inspection.update({
      where: { id: inspectionId },
      data: {
        scheduledAt: newDate,
        tenantConfirmedAt: null,
      },
    });

    // System message in conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        listingId: inspection.application.listingId,
        users: { some: { id: currentUser.id } },
      },
    });

    if (conversation) {
      await prisma.message.create({
        data: {
          body: `INSPECTION_RESCHEDULED|${inspectionId}|${inspection.type}|${newDate.toISOString()}`,
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
      const typeLabel = inspection.type === 'ENTRY' ? "d'entrée" : 'de sortie';
      const dateStr = newDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
      const timeStr = newDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      await createNotification({
        userId: inspection.tenantId,
        type: 'inspection',
        title: "État des lieux reprogrammé",
        message: `${landlordName} a reprogrammé l'état des lieux ${typeLabel} au ${dateStr} à ${timeStr}.`,
        link: `/inbox`,
      });

      sendPushNotification({
        userId: inspection.tenantId,
        title: "État des lieux reprogrammé",
        body: `Nouveau créneau : ${dateStr} à ${timeStr}.`,
        url: `/inbox`,
      }).catch(err => console.error("[Push] Failed:", err));
    }

    return NextResponse.json({ rescheduled: true, scheduledAt: newDate.toISOString() });
  } catch (error: unknown) {
    console.error('[Inspection Reschedule POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
