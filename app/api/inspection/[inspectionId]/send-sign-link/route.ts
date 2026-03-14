import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import jwt from 'jsonwebtoken';
import { createNotification } from '@/libs/notifications';
import { sendEmail } from '@/lib/email';
import { sendPushNotification } from '@/app/lib/sendPushNotification';
import { broadcastNewMessage } from '@/lib/supabaseServer';
import { getServerTranslation } from '@/lib/serverTranslations';

type Params = { params: Promise<{ inspectionId: string }> };

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret';

// POST /api/inspection/[inspectionId]/send-sign-link — Generate link + notify tenant
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
        application: {
          include: {
            listing: {
              include: {
                rentalUnit: {
                  include: { property: { select: { ownerId: true } } },
                },
              },
            },
            candidateScope: { select: { creatorUserId: true } },
          },
        },
      },
    });

    if (!inspection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const ownerId = inspection.application.listing.rentalUnit.property.ownerId;
    if (ownerId !== currentUser.id) {
      return NextResponse.json({ error: 'Only the landlord can send the sign link' }, { status: 403 });
    }

    if (!inspection.landlordSignature) {
      return NextResponse.json({ error: 'Landlord must sign first' }, { status: 400 });
    }

    const tenantId = inspection.application.candidateScope?.creatorUserId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found for this inspection' }, { status: 400 });
    }

    // Get tenant info
    const tenant = await prisma.user.findUnique({
      where: { id: tenantId },
      select: { email: true, name: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Generate JWT (24h expiration)
    const token = jwt.sign(
      { inspectionId, tenantId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || request.headers.get('origin')
      || `https://${request.headers.get('host')}`;
    const url = `${baseUrl}/inspection/${inspectionId}/sign/tenant?token=${token}`;

    const t = getServerTranslation('emails');
    const propertyTitle = inspection.application.listing.title || t('inspection.signLink.defaultProperty');

    // Send in-app notification
    await createNotification({
      userId: tenantId,
      type: 'inspection',
      title: t('inspection.signLink.notifTitle'),
      message: t('inspection.signLink.notifMessage', { property: propertyTitle }),
      link: url,
    });

    // Send push notification
    await sendPushNotification({
      userId: tenantId,
      title: t('inspection.signLink.pushTitle'),
      body: t('inspection.signLink.pushBody', { property: propertyTitle }),
      type: 'inspection',
      url,
    });

    // Send email
    if (tenant.email) {
      await sendEmail(
        tenant.email,
        t('inspection.signLink.emailSubject'),
        `<div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a1a1a; margin-bottom: 8px;">${t('inspection.signLink.emailHeading')}</h2>
          <p style="color: #555; line-height: 1.6;">
            ${t('inspection.signLink.emailGreeting', { name: tenant.name || '' })}<br/><br/>
            ${t('inspection.signLink.emailBody', { property: propertyTitle })}
          </p>
          <p style="color: #555; line-height: 1.6;">
            ${t('inspection.signLink.emailDeadline')}
          </p>
          <a href="${url}" style="display: inline-block; background: #1719FF; color: #fff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; margin: 16px 0;">
            ${t('inspection.signLink.emailCta')}
          </a>
          <p style="color: #999; font-size: 13px; margin-top: 24px;">
            ${t('inspection.signLink.emailExpiry')}
          </p>
        </div>`
      );
    }

    // Inject system message into conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        listingId: inspection.application.listingId,
        users: { some: { id: tenantId } },
      },
      include: { users: { select: { id: true } } },
    });

    if (conversation) {
      const newMessage = await prisma.message.create({
        data: {
          body: `INSPECTION_SIGN_LINK_SENT|${inspectionId}|${inspection.type}`,
          conversation: { connect: { id: conversation.id } },
          sender: { connect: { id: currentUser.id } },
          seen: { connect: { id: currentUser.id } },
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });

      // Broadcast for real-time updates
      const recipientIds = conversation.users.map((u) => u.id);
      broadcastNewMessage(conversation.id, recipientIds, {
        id: newMessage.id,
        conversationId: conversation.id,
        senderId: currentUser.id,
        body: newMessage.body,
        createdAt: newMessage.createdAt,
      }).catch(err => console.error('[send-sign-link] Broadcast failed:', err));
    }

    return NextResponse.json({ url, sent: true });
  } catch (error: unknown) {
    console.error('[Inspection Send-Sign-Link POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
