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

        // 4. Prepare Signers
        // Tenant(s) - use real phone from LeaseConfig
        const signers = leaseConfig.tenants.map((t: any) => {
            if (!t.phone) {
                throw new Error(`Le locataire ${t.name} n'a pas de numéro de téléphone renseigné. Le numéro est requis pour la signature électronique (OTP SMS).`);
            }
            return {
                first_name: t.firstName || t.name.split(' ')[0] || "Locataire",
                last_name: t.lastName || t.name.split(' ').slice(1).join(' ') || "Inconnu",
                email: t.email,
                phone_number: t.phone
            };
        });

        // Landlord
        if (!leaseConfig.landlord.phone) {
            throw new Error(`Le bailleur ${leaseConfig.landlord.name} n'a pas de numéro de téléphone renseigné.`);
        }
        signers.push({
            first_name: leaseConfig.landlord.name.split(' ')[0] || "Bailleur",
            last_name: leaseConfig.landlord.name.split(' ').slice(1).join(' ') || "Inconnu",
            email: leaseConfig.landlord.email,
            phone_number: leaseConfig.landlord.phone
        });

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

        return NextResponse.json({ success: true, signatureId });

    } catch (error: any) {
        console.error("Sign Trigger Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
