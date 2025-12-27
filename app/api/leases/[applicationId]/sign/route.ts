import React from "react";
import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { LeaseService } from "@/services/LeaseService";
import { YousignService } from "@/services/YousignService";
import ReactPDF from '@react-pdf/renderer';
import LeaseDocument from "@/components/documents/LeaseDocument";
import { LeaseConfig } from "@/services/LeaseService";

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
        // Tenant(s)
        const signers = leaseConfig.tenants.map((t: any) => ({
            first_name: t.name.split(' ')[0] || "Locataire",
            last_name: t.name.split(' ').slice(1).join(' ') || "Inconnu",
            email: t.email,
            phone_number: "+33612345678" // MOCK PHONE for Sandbox! Real phone needed for PROD.
            // Note: In Sandbox, all phones must be valid. We use a test number or the real one if provided.
            // Using a hardcoded test number for now to avoid errors with bad user data.
        }));

        // Landlord
        signers.push({
            first_name: leaseConfig.landlord.name.split(' ')[0] || "Bailleur",
            last_name: leaseConfig.landlord.name.split(' ').slice(1).join(' ') || "Inconnu",
            email: leaseConfig.landlord.email,
            phone_number: "+33612345678" // MOCK
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
