import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import { getRoomTemplate, EQUIPMENTS_BY_ROOM, SURFACE_ELEMENTS } from '@/lib/inspection';
import { createNotification } from '@/libs/notifications';
import { sendPushNotification } from '@/app/lib/sendPushNotification';
import type { InspectionRoomType } from '@prisma/client';

// POST /api/inspection — Create a new inspection from an applicationId
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { applicationId, type = 'ENTRY' } = body;

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
      return NextResponse.json({ error: `An ${type} inspection already exists for this lease` }, { status: 409 });
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
        await prisma.message.create({
          data: {
            body: `INSPECTION_STARTED|${inspection.id}|${type}`,
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
      await createNotification({
        userId: tenantId,
        type: 'inspection',
        title: "État des lieux démarré",
        message: `L'état des lieux ${type === 'ENTRY' ? "d'entrée" : 'de sortie'}${propertyCity ? ` à ${propertyCity}` : ''} a été démarré par le propriétaire.`,
        link: `/inspection/${inspection.id}`,
      });

      sendPushNotification({
        userId: tenantId,
        title: "État des lieux démarré",
        body: `L'état des lieux ${type === 'ENTRY' ? "d'entrée" : 'de sortie'} a été démarré. Vous serez invité à le signer.`,
        url: `/inspection/${inspection.id}`,
      });
    }

    return NextResponse.json(inspection, { status: 201 });
  } catch (error: unknown) {
    console.error('[Inspection POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
