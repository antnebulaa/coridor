import { NextResponse } from "next/server";
import crypto from 'crypto';
import prisma from "@/libs/prismadb";
import { YousignService } from "@/services/YousignService";
import { PassportService } from "@/services/PassportService";

const YOUSIGN_WEBHOOK_SECRET = process.env.YOUSIGN_WEBHOOK_SECRET;

// Yousign webhook events we care about
type YousignEvent =
    | "signature_request.done"
    | "signature_request.activated"
    | "signature_request.expired"
    | "signature_request.declined"
    | "signer.done";

interface YousignWebhookPayload {
    event_name: YousignEvent;
    event_time: string;
    data: {
        signature_request: {
            id: string;
            status: string;
            name: string;
        };
        signer?: {
            id: string;
            status: string;
            info: {
                first_name: string;
                last_name: string;
                email: string;
            };
        };
    };
}

// Helper to send push notification internally
async function sendNotification(userId: string, title: string, message: string, url?: string) {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        await fetch(`${baseUrl}/api/web-push/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, title, message, url })
        });
    } catch (error) {
        console.error("[Yousign Webhook] Failed to send notification:", error);
    }
}

export async function POST(request: Request) {
    try {
        // 1. Read raw body for HMAC validation
        const rawBody = await request.text();

        // 2. Validate HMAC signature (skip if secret not configured - dev mode)
        if (YOUSIGN_WEBHOOK_SECRET) {
            const receivedSignature = request.headers.get('x-yousign-signature-hmac-sha256');
            if (!receivedSignature) {
                console.warn("[Yousign Webhook] Missing HMAC signature header");
                return NextResponse.json({ error: "Missing signature" }, { status: 401 });
            }

            const expectedSignature = crypto
                .createHmac('sha256', YOUSIGN_WEBHOOK_SECRET)
                .update(rawBody)
                .digest('hex');

            if (!crypto.timingSafeEqual(
                Buffer.from(receivedSignature),
                Buffer.from(expectedSignature)
            )) {
                console.warn("[Yousign Webhook] Invalid HMAC signature");
                return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
            }
        } else {
            console.warn("[Yousign Webhook] YOUSIGN_WEBHOOK_SECRET not set - skipping HMAC validation");
        }

        // 3. Parse JSON after validation
        const payload: YousignWebhookPayload = JSON.parse(rawBody);

        console.log("[Yousign Webhook] Received:", payload.event_name, payload.data.signature_request.id);

        const signatureRequestId = payload.data.signature_request.id;

        // Find the application by Yousign signature ID
        const application = await prisma.rentalApplication.findFirst({
            where: { yousignSignatureId: signatureRequestId },
            include: {
                listing: {
                    include: {
                        rentalUnit: {
                            include: { property: true }
                        }
                    }
                },
                candidateScope: true
            }
        });

        if (!application) {
            console.log("[Yousign Webhook] No application found for signature:", signatureRequestId);
            return NextResponse.json({ received: true, matched: false });
        }

        switch (payload.event_name) {
            case "signature_request.done":
                // All signers have signed - lease is complete!
                console.log("[Yousign Webhook] Signature complete for application:", application.id);

                // Download signed document and get URL
                let signedUrl: string | null = null;
                try {
                    signedUrl = await YousignService.getSignedDocumentUrl(signatureRequestId);
                } catch (err) {
                    console.error("[Yousign Webhook] Failed to get signed document:", err);
                }

                // Update application status
                await prisma.rentalApplication.update({
                    where: { id: application.id },
                    data: {
                        leaseStatus: "SIGNED",
                        signedLeaseUrl: signedUrl
                    }
                });

                // Send notification to landlord
                const ownerId = application.listing?.rentalUnit?.property?.ownerId;
                const propertyCity = application.listing?.rentalUnit?.property?.city || "votre bien";

                if (ownerId) {
                    await sendNotification(
                        ownerId,
                        "Bail signé ! 🎉",
                        `Le bail pour ${propertyCity} a été signé par toutes les parties.`,
                        `/leases/${application.id}`
                    );
                }

                // Send notification to tenant (creator of candidateScope)
                const tenantUserId = application.candidateScope?.creatorUserId;
                if (tenantUserId) {
                    await sendNotification(
                        tenantUserId,
                        "Votre bail est signé ! 🎉",
                        "Félicitations ! Vous pouvez maintenant télécharger votre bail signé.",
                        `/leases/${application.id}`
                    );
                }

                // Auto-create RentalHistory entry for the Passeport Locatif
                try {
                    await PassportService.onLeaseSigned(application.id);
                    console.log("[Yousign Webhook] RentalHistory created for application:", application.id);
                } catch (passportErr) {
                    console.error("[Yousign Webhook] Failed to create RentalHistory:", passportErr);
                }
                break;

            case "signer.done":
                // One signer has completed - log for tracking
                const signerName = `${payload.data.signer?.info.first_name} ${payload.data.signer?.info.last_name}`;
                console.log("[Yousign Webhook] Signer completed:", signerName);
                break;

            case "signature_request.declined":
                // Someone declined to sign
                console.log("[Yousign Webhook] Signature declined for:", application.id);
                await prisma.rentalApplication.update({
                    where: { id: application.id },
                    data: { leaseStatus: "DRAFT" }
                });
                break;

            case "signature_request.expired":
                // Signature request expired
                console.log("[Yousign Webhook] Signature expired for:", application.id);
                await prisma.rentalApplication.update({
                    where: { id: application.id },
                    data: { leaseStatus: "DRAFT" }
                });
                break;
        }

        return NextResponse.json({ received: true, processed: true });

    } catch (error: any) {
        console.error("[Yousign Webhook] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Yousign may also send GET requests to verify the endpoint
export async function GET() {
    return NextResponse.json({ status: "ok", service: "yousign-webhook" });
}
