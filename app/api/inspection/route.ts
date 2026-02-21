import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import { getRoomTemplate, EQUIPMENTS_BY_ROOM, SURFACE_ELEMENTS } from '@/lib/inspection';
import { createNotification } from '@/libs/notifications';
import { sendPushNotification } from '@/app/lib/sendPushNotification';
import type { InspectionRoomType } from '@prisma/client';

// GET /api/inspection?listingId=xxx — Fetch inspections for a listing
export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('listingId');

    if (!listingId) {
      return NextResponse.json({ error: 'listingId is required' }, { status: 400 });
    }

    const inspections = await prisma.inspection.findMany({
      where: {
        application: {
          listingId,
          listing: {
            rentalUnit: {
              property: { ownerId: currentUser.id },
            },
          },
        },
      },
      select: {
        id: true,
        type: true,
        status: true,
        pdfUrl: true,
        startedAt: true,
        completedAt: true,
        landlordSignedAt: true,
        tenantSignedAt: true,
        createdAt: true,
        tenant: { select: { name: true } },
        rooms: { select: { isCompleted: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(inspections);
  } catch (error: unknown) {
    console.error('[Inspection GET] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/inspection — Create a new inspection from an applicationId
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { applicationId, type = 'ENTRY', scheduledAt } = body;

    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId is required' }, { status: 400 });
    }

    // Fetch the application with all needed relations
    const application = await prisma.rentalApplication.findUnique({
      where: { id: applicationId },
      include: {
        listing: {
          include: {
            rentalUnit: {
              include: {
                property: {
                  include: { rooms: true },
                },
              },
            },
          },
        },
        candidateScope: { select: { creatorUserId: true } },
      },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const property = application.listing.rentalUnit.property;

    // Verify the current user is the landlord (property owner)
    if (property.ownerId !== currentUser.id) {
      return NextResponse.json({ error: 'Only the landlord can create an inspection' }, { status: 403 });
    }

    // Check if an inspection of this type already exists
    const existing = await prisma.inspection.findUnique({
      where: { applicationId_type: { applicationId, type } },
    });

    if (existing) {
      return NextResponse.json({ error: `An ${type} inspection already exists for this lease`, existingId: existing.id, status: existing.status }, { status: 409 });
    }

    // Determine room template from listing data
    const listing = application.listing;
    const rentalUnit = listing.rentalUnit;

    // For colocation (private room), EDL covers just the rented room + common areas
    const isColocation = listing.leaseType === 'COLOCATION' || rentalUnit.type === 'PRIVATE_ROOM';

    let typology: string;

    if (isColocation) {
      // Colocation: 1 bedroom (the rented room) + common areas → T2
      typology = 'T2';
    } else if (listing.guestCount != null && listing.guestCount > 0) {
      // Best: use guestCount directly (nombre de chambres)
      // guestCount=1 → T2 (1 chambre), guestCount=2 → T3 (2 chambres), etc.
      typology = `T${listing.guestCount + 1}`;
    } else if (listing.guestCount === 0) {
      // Studio: 0 chambres
      typology = 'STUDIO';
    } else {
      // Fallback: derive from roomCount (pièces principales = T-number)
      const piecesCount = listing.roomCount || rentalUnit.roomCount || 2;
      typology = piecesCount <= 1 ? 'STUDIO' : `T${piecesCount}`;
    }

    const template = getRoomTemplate(typology);

    // Create the inspection with rooms, surface elements, and equipment elements
    const inspection = await prisma.inspection.create({
      data: {
        type,
        applicationId,
        propertyId: property.id,
        landlordId: currentUser.id,
        tenantId: application.candidateScope?.creatorUserId || null,
        ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
        rooms: {
          create: template.map((room, index) => ({
            roomType: room.type,
            name: room.name,
            order: index,
            elements: {
              create: [
                // Surface elements (Sols, Murs, Plafond)
                ...SURFACE_ELEMENTS.map((surface) => ({
                  category: surface.category,
                  name: surface.name,
                })),
                // Equipment elements for this room type
                ...EQUIPMENTS_BY_ROOM[room.type as InspectionRoomType].map((equipName) => ({
                  category: 'EQUIPMENT' as const,
                  name: equipName,
                })),
              ],
            },
          })),
        },
      },
      include: {
        meters: true,
        keys: true,
        rooms: {
          include: {
            elements: { include: { photos: true } },
            photos: true,
          },
          orderBy: { order: 'asc' },
        },
        photos: true,
        furniture: true,
      },
    });

    // Inject system message in conversation
    const tenantId = application.candidateScope?.creatorUserId;
    if (tenantId) {
      const conversation = await prisma.conversation.findFirst({
        where: {
          listingId: application.listingId,
          users: { every: { id: { in: [currentUser.id, tenantId] } } },
        },
      });

      if (conversation) {
        const messageType = scheduledAt
          ? `INSPECTION_SCHEDULED|${inspection.id}|${type}|${new Date(scheduledAt).toISOString()}`
          : `INSPECTION_STARTED|${inspection.id}|${type}`;

        await prisma.message.create({
          data: {
            body: messageType,
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

      // In-app notification
      const propertyCity = property.city || '';
      const typeLabel = type === 'ENTRY' ? "d'entrée" : 'de sortie';

      if (scheduledAt) {
        const schedDate = new Date(scheduledAt);
        const dateStr = schedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = schedDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        await createNotification({
          userId: tenantId,
          type: 'inspection',
          title: "État des lieux planifié",
          message: `Un état des lieux ${typeLabel}${propertyCity ? ` à ${propertyCity}` : ''} est planifié le ${dateStr} à ${timeStr}.`,
          link: `/inspection/${inspection.id}`,
        });

        sendPushNotification({
          userId: tenantId,
          title: "État des lieux planifié",
          body: `État des lieux ${typeLabel} planifié le ${dateStr} à ${timeStr}.`,
          url: `/inspection/${inspection.id}`,
        });
      } else {
        await createNotification({
          userId: tenantId,
          type: 'inspection',
          title: "État des lieux démarré",
          message: `L'état des lieux ${typeLabel}${propertyCity ? ` à ${propertyCity}` : ''} a été démarré par le propriétaire.`,
          link: `/inspection/${inspection.id}`,
        });

        sendPushNotification({
          userId: tenantId,
          title: "État des lieux démarré",
          body: `L'état des lieux ${typeLabel} a été démarré. Vous serez invité à le signer.`,
          url: `/inspection/${inspection.id}`,
        });
      }
    }

    return NextResponse.json(inspection, { status: 201 });
  } catch (error: unknown) {
    console.error('[Inspection POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
