import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import { createNotification } from '@/libs/notifications';
import { sendPushNotification } from '@/app/lib/sendPushNotification';

type Params = { params: Promise<{ inspectionId: string }> };

// GET /api/inspection/[inspectionId]/amendments — List amendments
export async function GET(request: Request, props: Params) {
  try {
    const { inspectionId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId },
      select: { landlordId: true, tenantId: true },
    });

    if (!inspection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Only landlord or tenant can view amendments
    if (currentUser.id !== inspection.landlordId && currentUser.id !== inspection.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const amendments = await prisma.inspectionAmendment.findMany({
      where: { inspectionId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(amendments);
  } catch (error: unknown) {
    console.error('[Amendments GET] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/inspection/[inspectionId]/amendments — Create amendment request (tenant)
export async function POST(request: Request, props: Params) {
  try {
    const { inspectionId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { description } = body;

    if (!description || !description.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
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
                      select: { city: true },
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

    // Only the tenant can request amendments
    if (inspection.tenantId !== currentUser.id) {
      return NextResponse.json({ error: 'Only the tenant can request amendments' }, { status: 403 });
    }

    // Must be SIGNED status
    if (inspection.status !== 'SIGNED') {
      return NextResponse.json({ error: 'Inspection must be signed' }, { status: 400 });
    }

    // Check 10-day deadline from tenant signature
    if (inspection.tenantSignedAt) {
      const deadline = new Date(inspection.tenantSignedAt);
      deadline.setDate(deadline.getDate() + 10);
      if (new Date() > deadline) {
        return NextResponse.json({ error: 'Le délai de 10 jours est dépassé' }, { status: 400 });
      }
    }

    // Create amendment
    const amendment = await prisma.inspectionAmendment.create({
      data: {
        inspectionId,
        requestedBy: currentUser.id,
        description: description.trim(),
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
          body: `INSPECTION_AMENDMENT_REQUESTED|${inspectionId}|${amendment.id}|${description.trim().substring(0, 100)}`,
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
    const tenantName = inspection.tenant?.name || 'Le locataire';
    await createNotification({
      userId: inspection.landlordId,
      type: 'inspection',
      title: "Demande de rectification EDL",
      message: `${tenantName} a signalé un défaut : "${description.trim().substring(0, 80)}"`,
      link: `/inspection/${inspectionId}/done`,
    });

    sendPushNotification({
      userId: inspection.landlordId,
      title: "Rectification EDL demandée",
      body: `${tenantName} : "${description.trim().substring(0, 60)}"`,
      url: `/inspection/${inspectionId}/done`,
    }).catch(err => console.error("[Push] Failed:", err));

    return NextResponse.json(amendment, { status: 201 });
  } catch (error: unknown) {
    console.error('[Amendments POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
