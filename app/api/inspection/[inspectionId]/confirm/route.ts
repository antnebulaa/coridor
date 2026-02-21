import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import { createNotification } from '@/libs/notifications';
import { sendPushNotification } from '@/app/lib/sendPushNotification';

type Params = { params: Promise<{ inspectionId: string }> };

// POST /api/inspection/[inspectionId]/confirm — Tenant confirms scheduled EDL
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
                      select: { city: true, address: true, addressLine1: true },
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

    // Only the tenant can confirm
    if (inspection.tenantId !== currentUser.id) {
      return NextResponse.json({ error: 'Only the tenant can confirm' }, { status: 403 });
    }

    // Must be DRAFT with a scheduledAt
    if (inspection.status !== 'DRAFT' || !inspection.scheduledAt) {
      return NextResponse.json({ error: 'Inspection is not scheduled' }, { status: 400 });
    }

    // Already confirmed
    if (inspection.tenantConfirmedAt) {
      return NextResponse.json({ error: 'Already confirmed' }, { status: 409 });
    }

    // Update inspection
    await prisma.inspection.update({
      where: { id: inspectionId },
      data: { tenantConfirmedAt: new Date() },
    });

    // Find conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        listingId: inspection.application.listingId,
        users: { some: { id: currentUser.id } },
      },
    });

    if (conversation) {
      await prisma.message.create({
        data: {
          body: `INSPECTION_CONFIRMED|${inspectionId}|${inspection.type}|${inspection.scheduledAt.toISOString()}`,
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

    // Notify landlord
    const scheduledDate = inspection.scheduledAt;
    const dateStr = scheduledDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    const timeStr = scheduledDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const typeLabel = inspection.type === 'ENTRY' ? "d'entrée" : 'de sortie';
    const tenantName = inspection.tenant?.name || 'Le locataire';

    await createNotification({
      userId: inspection.landlordId,
      type: 'inspection',
      title: "Créneau EDL confirmé",
      message: `${tenantName} a confirmé l'état des lieux ${typeLabel} du ${dateStr} à ${timeStr}.`,
      link: `/calendar`,
    });

    sendPushNotification({
      userId: inspection.landlordId,
      title: "Créneau EDL confirmé",
      body: `${tenantName} a confirmé l'état des lieux ${typeLabel} du ${dateStr} à ${timeStr}.`,
      url: `/calendar`,
    }).catch(err => console.error("[Push] Failed:", err));

    return NextResponse.json({ confirmed: true });
  } catch (error: unknown) {
    console.error('[Inspection Confirm POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
