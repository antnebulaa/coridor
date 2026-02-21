import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import jwt from 'jsonwebtoken';
import { createNotification } from '@/libs/notifications';
import { sendPushNotification } from '@/app/lib/sendPushNotification';

type Params = { params: Promise<{ inspectionId: string }> };

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret';

// POST /api/inspection/[inspectionId]/sign — Sign the inspection
export async function POST(request: Request, props: Params) {
  try {
    const { inspectionId } = await props.params;
    const body = await request.json();
    const { role, signature, reserves, token } = body;

    if (!role || !signature) {
      return NextResponse.json({ error: 'role and signature are required' }, { status: 400 });
    }

    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: {
        application: {
          include: {
            listing: {
              include: { rentalUnit: { include: { property: { select: { ownerId: true } } } } },
            },
            candidateScope: { select: { creatorUserId: true } },
          },
        },
      },
    });

    if (!inspection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Landlord signature: must be authenticated as the landlord
    if (role === 'landlord') {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      if (inspection.application.listing.rentalUnit.property.ownerId !== currentUser.id) {
        return NextResponse.json({ error: 'Only the landlord can sign as landlord' }, { status: 403 });
      }

      if (inspection.landlordSignature) {
        return NextResponse.json({ error: 'Landlord has already signed' }, { status: 409 });
      }

      const updated = await prisma.inspection.update({
        where: { id: inspectionId },
        data: {
          landlordSignature: signature,
          landlordSignedAt: new Date(),
          status: 'PENDING_SIGNATURE',
        },
      });

      // Inject system message: landlord signed, waiting for tenant
      const tenantId = inspection.application.candidateScope?.creatorUserId;
      if (tenantId) {
        const conversation = await prisma.conversation.findFirst({
          where: {
            listingId: inspection.application.listingId,
            users: { some: { id: tenantId } },
          },
        });

        if (conversation) {
          await prisma.message.create({
            data: {
              body: `INSPECTION_COMPLETED|${inspectionId}|${inspection.type}`,
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
      }

      return NextResponse.json(updated);
    }

    // Tenant signature: via JWT token OR authenticated session
    if (role === 'tenant') {
      let tenantId: string | null = null;

      // Option 1: JWT token
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { inspectionId: string; tenantId: string };
          if (decoded.inspectionId !== inspectionId) {
            return NextResponse.json({ error: 'Token mismatch' }, { status: 403 });
          }
          tenantId = decoded.tenantId;
        } catch {
          return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }
      } else {
        // Option 2: Authenticated session
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        tenantId = currentUser.id;
      }

      if (tenantId !== inspection.application.candidateScope?.creatorUserId) {
        return NextResponse.json({ error: 'Only the tenant can sign as tenant' }, { status: 403 });
      }

      if (inspection.tenantSignature) {
        return NextResponse.json({ error: 'Tenant has already signed' }, { status: 409 });
      }

      const updateData: Record<string, unknown> = {
        tenantSignature: signature,
        tenantSignedAt: new Date(),
      };

      if (reserves) {
        updateData.tenantReserves = reserves;
      }

      // If landlord has already signed, mark as SIGNED
      if (inspection.landlordSignature) {
        updateData.status = 'SIGNED';
        updateData.completedAt = new Date();
      }

      const updated = await prisma.inspection.update({
        where: { id: inspectionId },
        data: updateData,
      });

      // If both have signed → inject system message
      if (updated.status === 'SIGNED') {
        const landlordId = inspection.application.listing.rentalUnit.property.ownerId;
        const candidateId = inspection.application.candidateScope?.creatorUserId;

        if (landlordId && candidateId) {
          const conversation = await prisma.conversation.findFirst({
            where: {
              listingId: inspection.application.listingId,
              users: { every: { id: { in: [landlordId, candidateId] } } },
            },
          });

          if (conversation) {
            await prisma.message.create({
              data: {
                body: `INSPECTION_SIGNED|${inspectionId}|${inspection.type}`,
                conversation: { connect: { id: conversation.id } },
                sender: { connect: { id: tenantId! } },
                seen: { connect: { id: tenantId! } },
              },
            });

            await prisma.conversation.update({
              where: { id: conversation.id },
              data: { lastMessageAt: new Date() },
            });
          }

          // Notify both parties
          for (const userId of [landlordId, candidateId]) {
            await createNotification({
              userId,
              type: 'inspection',
              title: "État des lieux signé",
              message: `L'état des lieux ${inspection.type === 'ENTRY' ? "d'entrée" : 'de sortie'} a été signé par les deux parties.`,
              link: `/inspection/${inspectionId}/done`,
            });

            sendPushNotification({
              userId,
              title: "État des lieux signé",
              body: "L'état des lieux a été signé par les deux parties.",
              url: `/inspection/${inspectionId}/done`,
            });
          }
        }
      }

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'role must be "landlord" or "tenant"' }, { status: 400 });
  } catch (error: unknown) {
    console.error('[Inspection Sign POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
