import React from "react";
import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { LeaseService } from "@/services/LeaseService";
import { YousignService } from "@/services/YousignService";
import ReactPDF from '@react-pdf/renderer';
import LeaseDocument from "@/components/documents/LeaseDocument";
import { LeaseConfig } from "@/services/LeaseService";
import { hasFeature } from '@/lib/features';
import { createNotification } from '@/libs/notifications';
import { sendPushNotification } from '@/app/lib/sendPushNotification';

// Helper to render PDF to Buffer
const renderToBuffer = async (element: React.ReactElement): Promise<Buffer> => {
    const stream = await ReactPDF.renderToStream(element as any);
    return new Promise((resolve, reject) => {
        const chunks: Uint8Array[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', (err) => reject(err));
    });
};

export async function POST(
    request: Request,
    props: { params: Promise<{ applicationId: string }> }
) {
    try {
        const params = await props.params;
        const currentUser = await getCurrentUser();
        if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Check feature access
        const canGenerate = await hasFeature(currentUser.id, 'LEASE_GENERATION');
        if (!canGenerate) {
          return NextResponse.json(
            { error: 'La génération de baux nécessite un abonnement Essentiel ou Pro.' },
            { status: 403 }
          );
        }


        const applicationId = params.applicationId;

        // 1. Fetch Application & Data
        const application = await prisma.rentalApplication.findUnique({
            where: { id: applicationId },
            include: {
                listing: {
                    include: {
                        rentalUnit: {
                            include: {
                                property: true
                            }
                        }
                    }
                },
                candidateScope: {
                    include: {
                        creatorUser: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });

        if (!application) return NextResponse.json({ error: "Not Found" }, { status: 404 });

        // Ensure current user is the landlord
        if (application.listing?.rentalUnit.property.ownerId !== currentUser.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 2. Generate Lease Config
        const leaseConfig: LeaseConfig = await LeaseService.generateLeaseConfig(applicationId);

        // 3. Generate PDF Buffer
        const pdfBuffer = await renderToBuffer(React.createElement(LeaseDocument, { data: leaseConfig }));

        // 4. Prepare & validate signers
        const normalizePhone = (phone: string): string => {
            let p = phone.replace(/[\s.\-()]/g, '');
            if (p.startsWith('0') && p.length === 10) p = '+33' + p.slice(1);
            if (p.startsWith('33') && !p.startsWith('+')) p = '+' + p;
            if (!p.startsWith('+')) p = '+33' + p;
            return p;
        };

        const signers = leaseConfig.tenants.map((t: any) => {
            if (!t.phone) {
                throw new Error(`Le locataire ${t.name} n'a pas de numéro de téléphone renseigné. Le numéro est requis pour la signature électronique (OTP SMS).`);
            }
            return {
                first_name: (t.firstName || t.name.split(' ')[0] || "Locataire").trim(),
                last_name: (t.lastName || t.name.split(' ').slice(1).join(' ') || "Inconnu").trim(),
                email: t.email.trim(),
                phone_number: normalizePhone(t.phone)
            };
        });

        if (!leaseConfig.landlord.phone) {
            throw new Error(`Le bailleur ${leaseConfig.landlord.name} n'a pas de numéro de téléphone renseigné.`);
        }
        signers.push({
            first_name: (leaseConfig.landlord.name.split(' ')[0] || "Bailleur").trim(),
            last_name: (leaseConfig.landlord.name.split(' ').slice(1).join(' ') || "Inconnu").trim(),
            email: leaseConfig.landlord.email.trim(),
            phone_number: normalizePhone(leaseConfig.landlord.phone)
        });

        console.log("[Sign] Signers payload:", JSON.stringify(signers, null, 2));

        // 5. Initiate via Yousign
        const signatureId = await YousignService.initiateSignatureRequest(
            `Bail - ${leaseConfig.property.city} - ${leaseConfig.listing_id}`,
            pdfBuffer,
            signers
        );

        // 6. Update Database
        await prisma.rentalApplication.update({
            where: { id: applicationId },
            data: {
                leaseStatus: "PENDING_SIGNATURE",
                yousignSignatureId: signatureId
            }
        });

        // 7. Notify tenant(s) — system message + notification + push
        const candidate = application.candidateScope?.creatorUser;
        const listingTitle = application.listing?.title || 'votre logement';
        const propertyCity = application.listing?.rentalUnit?.property?.city || '';

        if (candidate) {
            // Find conversation between landlord and tenant for this listing
            const conversation = await prisma.conversation.findFirst({
                where: {
                    listingId: application.listingId,
                    users: {
                        every: {
                            id: { in: [currentUser.id, candidate.id] }
                        }
                    }
                }
            });

            // Create system message in conversation
            if (conversation) {
                await prisma.message.create({
                    data: {
                        body: 'LEASE_SENT_FOR_SIGNATURE',
                        conversation: { connect: { id: conversation.id } },
                        sender: { connect: { id: currentUser.id } },
                        seen: { connect: { id: currentUser.id } }
                    }
                });

                await prisma.conversation.update({
                    where: { id: conversation.id },
                    data: { lastMessageAt: new Date() }
                });
            }

            // In-app notification
            await createNotification({
                userId: candidate.id,
                type: 'lease',
                title: 'Bail envoyé pour signature',
                message: `Un bail de location pour "${listingTitle}"${propertyCity ? ` à ${propertyCity}` : ''} vous a été envoyé pour signature électronique.`,
                link: `/leases/${applicationId}`
            });

            // Push notification
            sendPushNotification({
                userId: candidate.id,
                title: 'Bail envoyé pour signature',
                body: `Votre bail pour "${listingTitle}" est prêt à être signé. Consultez-le maintenant.`,
                url: `/leases/${applicationId}`,
                type: 'lease'
            }).catch(err => console.error("[Push] Failed to notify tenant:", err));
        }

        return NextResponse.json({ success: true, signatureId });

    } catch (error: any) {
        // Extract the most useful error message
        const detail = error?.response?.data?.detail
            || error?.response?.data?.message
            || error?.response?.data
            || error.message;
        console.error("Sign Trigger Error:", JSON.stringify(detail, null, 2) || error);
        return NextResponse.json({ error: typeof detail === 'string' ? detail : JSON.stringify(detail) }, { status: 500 });
    }
}
