'use client';

import { SafeUser } from "@/types";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Container from "@/components/Container";
import { CheckCircle2, Circle, FolderOpen, Calendar } from "lucide-react";
import { useMemo } from "react";
import Link from "next/link";
import VisitCard from "./components/VisitCard";
import SubscriptionCarousel from "./components/SubscriptionCarousel";

interface TenantDashboardClientProps {
    currentUser: SafeUser;
    rentalProject: any; // SafeTenantCandidateScope
    applications?: any[];
    visits?: any[];
}

const TenantDashboardClient: React.FC<TenantDashboardClientProps> = ({
    currentUser,
    rentalProject,
    applications = [],
    visits = []
}) => {
    const router = useRouter();
    const tenantProfile = (currentUser as any).tenantProfile;

    // Active Applications Count
    const activeApplicationsCount = applications.filter(app =>
        ['PENDING', 'SENT', 'VISIT_PROPOSED', 'VISIT_CONFIRMED', 'ACCEPTED'].includes(app.status)
    ).length;

    // 1. Account Created (Always true if logged in)
    const isAccountCreated = true;

    // 2. Rental Project Defined
    const isProjectDefined = useMemo(() => {
        return !!rentalProject;
    }, [rentalProject]);

    // 3. Personal Info Completed
    const isIdentityConfirmed = useMemo(() => {
        return !!(
            currentUser.firstName &&
            currentUser.lastName &&
            currentUser.phoneNumber &&
            currentUser.address &&
            currentUser.zipCode &&
            currentUser.city &&
            currentUser.birthDate &&
            currentUser.birthPlace
        );
    }, [currentUser]);

    // 4. Dossier Locataire Completed
    const isDossierCompleted = useMemo(() => {
        if (!tenantProfile) return false;

        // Check Self Job/Income (Basic requirement)
        const hasSelfInfo = !!tenantProfile.netSalary && !!tenantProfile.jobTitle;

        if (!hasSelfInfo) return false;

        // Check Partner if Couple
        if (rentalProject?.compositionType === 'COUPLE') {
            const hasPartnerInfo = !!tenantProfile.partnerNetSalary && !!tenantProfile.partnerJobTitle;
            if (!hasPartnerInfo) return false;
        }

        return true;
    }, [tenantProfile, rentalProject]);

    const steps = [
        {
            id: 'account',
            label: 'Créer mon compte',
            isCompleted: isAccountCreated,
            href: '/account/profile'
        },
        {
            id: 'project',
            label: 'Définir mon projet de location',
            isCompleted: isProjectDefined,
            href: '/account/project'
        },
        {
            id: 'identity',
            label: 'Confirmer mon identité',
            isCompleted: isIdentityConfirmed,
            href: '/account/personal-info'
        },
        {
            id: 'dossier',
            label: 'Compléter mon dossier locataire avec DossierFacile',
            isCompleted: isDossierCompleted,
            href: '/account/tenant-profile'
        }
    ];

    const completedCount = steps.filter(s => s.isCompleted).length;
    const progress = (completedCount / steps.length) * 100;

    return (
        <Container>
            <div className="pb-20">
                <PageHeader
                    title="Tableau de bord"
                    subtitle="Bienvenue sur votre espace locataire."
                />

                <div className="max-w-2xl mx-auto mt-8 flex flex-col gap-6">
                    {/* My Applications Tile */}
                    <Link
                        href="/dashboard/applications"
                        className="bg-neutral-100 rounded-2xl p-6 hover:border-black/20 hover:shadow-md transition group cursor-pointer flex items-center justify-between"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <FolderOpen size={24} />
                            </div>
                            <div className="flex flex-col">
                                <div className="font-medium text-lg text-neutral-900 group-hover:text-blue-600 transition">
                                    Mes Candidatures
                                </div>
                                <div className="text-neutral-500 text-sm">
                                    {activeApplicationsCount > 0
                                        ? `${activeApplicationsCount} candidature${activeApplicationsCount > 1 ? 's' : ''} en cours`
                                        : "Aucune candidature en cours"
                                    }
                                </div>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center group-hover:bg-neutral-200 transition">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-neutral-500">
                                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </Link>

                    {/* Visits Section */}
                    {visits.length > 0 && (
                        <div className="flex flex-col gap-4 mt-1.5">
                            <div className="flex items-center gap-2 text-2xl font-medium text-neutral-900">
                                <Calendar className="text-neutral-500" size={20} />
                                Mes rendez-vous à venir
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {visits.map((visit) => (
                                    <VisitCard key={visit.id} visit={visit} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Subscription Carousel */}
                    <SubscriptionCarousel />

                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-xl font-medium mb-2">
                                Préparez votre dossier pour ne rater aucun logement
                            </h2>
                            <p className="text-neutral-500 text-sm mb-4">
                                Un dossier complet multiplie vos chances d'obtenir une visite.
                            </p>

                            {/* Progress Bar */}
                            <div className="flex items-center gap-3 mb-1">
                                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-500 ease-out"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <span className="text-sm font-medium text-primary">
                                    {Math.round(progress)}%
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            {steps.map((step) => (
                                <Link
                                    key={step.id}
                                    href={step.href}
                                    className={`
                                        flex items-center gap-3 p-3 rounded-xl transition
                                        ${step.isCompleted ? 'bg-secondary/50 opacity-100' : 'bg-white border border-border hover:border-primary/50 hover:shadow-sm'}
                                    `}
                                >
                                    <div className={`
                                        shrink-0
                                        ${step.isCompleted ? 'text-green-500' : 'text-neutral-300'}
                                    `}>
                                        {step.isCompleted ? (
                                            <CheckCircle2 size={24} className="fill-green-100" />
                                        ) : (
                                            <Circle size={24} />
                                        )}
                                    </div>
                                    <div className={`font-medium ${step.isCompleted ? 'text-neutral-500 line-through' : 'text-foreground'}`}>
                                        {step.label}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Container>
    );
}

export default TenantDashboardClient;
