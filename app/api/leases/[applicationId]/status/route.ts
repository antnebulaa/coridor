import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { YousignService } from "@/services/YousignService";

export async function GET(
    request: Request,
    props: { params: Promise<{ applicationId: string }> }
) {
    try {
        const params = await props.params;
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const applicationId = params.applicationId;

        // Fetch application
        const application = await prisma.rentalApplication.findUnique({
            where: { id: applicationId },
            include: {
                listing: {
                    include: {
                        rentalUnit: {
                            include: { property: true }
                        }
                    }
                }
            }
        });

        if (!application) {
            return NextResponse.json({ error: "Not Found" }, { status: 404 });
        }

        // Check authorization: must be landlord or tenant
        const isLandlord = application.listing?.rentalUnit?.property?.ownerId === currentUser.id;
        // For tenant check, we'd need to check candidateScope members
        // For now, allow if landlord or if they have the link
        if (!isLandlord) {
            // Optionally check if user is in candidateScope
        }

        // If no Yousign ID, return current DB status
        if (!application.yousignSignatureId) {
            return NextResponse.json({
                status: application.leaseStatus,
                signedUrl: application.signedLeaseUrl,
                signers: []
            });
        }

        try {
            // Poll Yousign API for current status
            console.log("[LeaseStatus] Fetching Yousign status for:", application.yousignSignatureId);
            const yousignStatus = await YousignService.getSignatureStatus(application.yousignSignatureId);
            console.log("[LeaseStatus] Yousign response:", JSON.stringify({ status: yousignStatus.status, signers: yousignStatus.signers }));

            // Map Yousign status to our status
            let mappedStatus = application.leaseStatus;
            if (yousignStatus.status === "done") {
                mappedStatus = "SIGNED";
            } else if (yousignStatus.status === "ongoing") {
                mappedStatus = "PENDING_SIGNATURE";
            } else if (yousignStatus.status === "expired" || yousignStatus.status === "declined") {
                mappedStatus = "DRAFT";
            }

            // If status changed, update DB
            if (mappedStatus !== application.leaseStatus) {
                let signedUrl = application.signedLeaseUrl;

                // If now signed, try to get the signed document
                if (mappedStatus === "SIGNED" && !signedUrl) {
                    try {
                        signedUrl = await YousignService.getSignedDocumentUrl(application.yousignSignatureId);
                    } catch (e) {
                        console.error("Failed to get signed URL:", e);
                    }
                }

                await prisma.rentalApplication.update({
                    where: { id: applicationId },
                    data: {
                        leaseStatus: mappedStatus,
                        signedLeaseUrl: signedUrl
                    }
                });
            }

            // Find the current user's signer entry
            const currentUserEmail = currentUser.email?.toLowerCase();
            const currentSigner = yousignStatus.signers.find(
                s => s.email.toLowerCase() === currentUserEmail
            );

            const currentUserSigned = currentSigner?.status === 'signed' || !!currentSigner?.signed_at;

            return NextResponse.json({
                status: mappedStatus,
                signedUrl: application.signedLeaseUrl,
                signers: yousignStatus.signers,
                signatureLink: currentSigner?.signature_link || null,
                currentUserSigned
            });

        } catch (yousignError: any) {
            console.error("Yousign status check failed:", yousignError);
            // Fall back to DB status
            return NextResponse.json({
                status: application.leaseStatus,
                signedUrl: application.signedLeaseUrl,
                signers: [],
                error: "Unable to fetch live status"
            });
        }

    } catch (error: any) {
        console.error("Status check error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
