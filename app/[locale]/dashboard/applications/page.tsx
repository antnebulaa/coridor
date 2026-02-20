import { redirect } from "next/navigation";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getApplications from "@/app/actions/getApplications";
import prisma from "@/libs/prismadb";
import ClientOnly from "@/components/ClientOnly";
import ApplicationsClient from "./ApplicationsClient";

const ApplicationsPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect('/');
    }

    const applications = await getApplications();

    // For landlords: find listings with at least 2 evaluated candidates
    let evaluatedListings: { listingId: string; listingTitle: string; evaluatedCount: number }[] = [];
    if (currentUser.userMode === 'LANDLORD') {
        try {
            const listingsWithEvals = await prisma.listing.findMany({
                where: {
                    rentalUnit: {
                        property: {
                            ownerId: currentUser.id
                        }
                    },
                    applications: {
                        some: {
                            evaluation: { isNot: null }
                        }
                    }
                },
                select: {
                    id: true,
                    title: true,
                    _count: {
                        select: {
                            applications: {
                                where: {
                                    evaluation: { isNot: null }
                                }
                            }
                        }
                    }
                }
            });

            evaluatedListings = listingsWithEvals
                .filter((l) => l._count.applications >= 2)
                .map((l) => ({
                    listingId: l.id,
                    listingTitle: l.title,
                    evaluatedCount: l._count.applications,
                }));
        } catch (error) {
            console.error("Error fetching evaluated listings:", error);
        }
    }

    return (
        <ClientOnly>
            <ApplicationsClient
                currentUser={currentUser}
                applications={applications}
                evaluatedListings={evaluatedListings}
            />
        </ClientOnly>
    );
}

export default ApplicationsPage;
