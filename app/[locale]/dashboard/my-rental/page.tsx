import { redirect } from "next/navigation";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getActiveRental from "@/app/actions/getActiveRental";
import ClientOnly from "@/components/ClientOnly";
import MyRentalClient from "./MyRentalClient";
import prisma from "@/libs/prismadb";

export const dynamic = 'force-dynamic';

const MyRentalPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect('/');
    }

    const rental = await getActiveRental();

    // Fetch inspections for this tenant's application
    let inspections: { id: string; status: string; type: string; pdfUrl: string | null; updatedAt: string; landlordSignedAt: string | null; tenantSignedAt: string | null }[] = [];
    if (rental?.applicationId) {
        try {
            const raw = await prisma.inspection.findMany({
                where: { applicationId: rental.applicationId },
                select: {
                    id: true,
                    status: true,
                    type: true,
                    pdfUrl: true,
                    updatedAt: true,
                    landlordSignedAt: true,
                    tenantSignedAt: true,
                },
                orderBy: { updatedAt: 'desc' },
            });
            inspections = raw.map(i => ({
                id: i.id,
                status: i.status,
                type: i.type,
                pdfUrl: i.pdfUrl,
                updatedAt: i.updatedAt.toISOString(),
                landlordSignedAt: i.landlordSignedAt?.toISOString() || null,
                tenantSignedAt: i.tenantSignedAt?.toISOString() || null,
            }));
        } catch (error) {
            console.error("Error fetching tenant inspections:", error);
        }
    }

    return (
        <ClientOnly>
            <MyRentalClient currentUser={currentUser} rental={rental} inspections={inspections} />
        </ClientOnly>
    );
}

export default MyRentalPage;
