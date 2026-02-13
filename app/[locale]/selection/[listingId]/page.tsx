import EmptyState from "@/components/EmptyState";
import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import SelectionClient from "./SelectionClient";

export const dynamic = 'force-dynamic';

interface IParams {
    listingId: string;
}

/** Criterion labels in French */
const criterionLabels: Record<string, string> = {
    PUNCTUALITY: 'Ponctualite',
    FILE_COMPLETENESS: 'Completude dossier',
    INCOME_ADEQUACY: 'Revenus',
    GUARANTOR_QUALITY: 'Garant',
    LEASE_COMPATIBILITY: 'Bail',
    MOVE_IN_FLEXIBILITY: 'Emmenagement',
    INTEREST_LEVEL: 'Interet',
    QUESTIONS_ASKED: 'Questions posees',
    CONDITIONS_GRASPED: 'Comprehension',
    RENTAL_PROJECT: 'Projet locatif',
    PROFILE_STABILITY: 'Stabilite',
    HOUSING_ADEQUACY: 'Adequation logement',
};

/** Map a 1-5 score to 1=bon, 2=moyen, 3=faible for display */
function mapScoreToDisplay(score: number): number {
    if (score >= 4) return 1; // bon
    if (score >= 3) return 2; // moyen
    return 3; // faible
}

const SelectionPage = async ({ params }: { params: Promise<IParams> }) => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return (
            <ClientOnly>
                <EmptyState
                    title="Non autorise"
                    subtitle="Veuillez vous connecter"
                />
            </ClientOnly>
        );
    }

    const { listingId } = await params;

    // Verify listing ownership
    const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: {
            rentalUnit: {
                include: { property: true }
            }
        }
    });

    if (!listing) {
        return (
            <ClientOnly>
                <EmptyState
                    title="Annonce introuvable"
                    subtitle="Cette annonce n'existe pas."
                />
            </ClientOnly>
        );
    }

    if (listing.rentalUnit.property.ownerId !== currentUser.id) {
        return (
            <ClientOnly>
                <EmptyState
                    title="Acces refuse"
                    subtitle="Vous n'etes pas le proprietaire de cette annonce."
                />
            </ClientOnly>
        );
    }

    // Fetch evaluations with all needed relations
    const evaluations = await prisma.candidateEvaluation.findMany({
        where: {
            application: { listingId }
        },
        include: {
            scores: true,
            application: {
                include: {
                    candidateScope: {
                        include: {
                            creatorUser: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                }
                            }
                        }
                    }
                }
            },
            visit: {
                select: {
                    date: true,
                }
            }
        },
        orderBy: { compositeScore: 'desc' }
    });

    if (evaluations.length === 0) {
        return (
            <ClientOnly>
                <EmptyState
                    title="Aucune evaluation"
                    subtitle="Vous n'avez pas encore evalue de candidats pour cette annonce. Evaluez vos candidats apres les visites."
                    showReset={false}
                />
            </ClientOnly>
        );
    }

    // Fetch tenant profiles for dossier data
    const userIds = evaluations.map(
        (e) => e.application.candidateScope.creatorUser.id
    );

    const tenantProfiles = await prisma.tenantProfile.findMany({
        where: { userId: { in: userIds } },
        include: { guarantors: true }
    });

    const profileMap = new Map(
        tenantProfiles.map((tp) => [tp.userId, tp])
    );

    // Build CandidateData array
    const candidates = evaluations.map((evaluation) => {
        const user = evaluation.application.candidateScope.creatorUser;
        const profile = profileMap.get(user.id);
        const lastNameInitial = user.lastName ? user.lastName.charAt(0) + '.' : '';
        const candidateName = `${user.firstName || 'Candidat'} ${lastNameInitial}`;

        // Revenue ratio
        const netSalary = profile?.netSalary || null;
        const revenueRatio = netSalary && listing.price > 0
            ? Math.round((netSalary / listing.price) * 10) / 10
            : null;

        // File completeness (simple heuristic based on filled fields)
        let filledFields = 0;
        let totalFields = 5;
        if (profile) {
            if (profile.jobType) filledFields++;
            if (profile.jobTitle) filledFields++;
            if (profile.netSalary) filledFields++;
            if (profile.bio) filledFields++;
            if (profile.guarantors && profile.guarantors.length > 0) filledFields++;
        }
        const fileCompleteness = Math.round((filledFields / totalFields) * 100);

        // Guarantor
        const hasGuarantor = (profile?.guarantors?.length || 0) > 0;
        const guarantorType = hasGuarantor && profile?.guarantors?.[0]
            ? profile.guarantors[0].type
            : null;

        // Lease compatibility (simplified - assume compatible if we don't have matching data)
        const leaseCompatible = true;

        // Move-in compatibility (simplified)
        const moveInCompatible = true;

        // Map scores - separate dossier-auto from visit-impression
        const visitCriteria = ['PUNCTUALITY', 'INTEREST_LEVEL', 'QUESTIONS_ASKED', 'CONDITIONS_GRASPED', 'RENTAL_PROJECT'];
        const scores = evaluation.scores
            .filter((s) => visitCriteria.includes(s.criterion))
            .map((s) => ({
                criterion: s.criterion,
                score: mapScoreToDisplay(s.score),
                label: criterionLabels[s.criterion] || s.criterion,
            }));

        // Composite score: scale to 0-10
        const compositeScore = Math.min(10, Math.round(evaluation.compositeScore * 10) / 10);

        // Visit date
        const visitDate = evaluation.visit?.date
            ? new Date(evaluation.visit.date).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
            })
            : 'N/A';

        return {
            applicationId: evaluation.application.id,
            candidateName,
            visitDate,
            decision: evaluation.decision as 'SHORTLISTED' | 'UNDECIDED' | 'ELIMINATED',
            compositeScore,
            scores,
            dossier: {
                revenueRatio,
                fileCompleteness,
                hasGuarantor,
                guarantorType,
                leaseCompatible,
                moveInCompatible,
            },
            applicationStatus: evaluation.application.status,
        };
    });

    // Stats
    const totalEvaluated = candidates.length;
    const shortlisted = candidates.filter((c) => c.decision === 'SHORTLISTED').length;

    return (
        <ClientOnly>
            <SelectionClient
                listingId={listingId}
                listingTitle={listing.title}
                listingPrice={listing.price}
                candidates={candidates}
                totalEvaluated={totalEvaluated}
                shortlisted={shortlisted}
            />
        </ClientOnly>
    );
};

export default SelectionPage;
