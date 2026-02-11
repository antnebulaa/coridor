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
import { useTranslations } from 'next-intl';

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
    const t = useTranslations('dashboard');
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
            label: t('steps.createAccount'),
            isCompleted: isAccountCreated,
            href: '/account/profile'
        },
        {
            id: 'project',
            label: t('steps.defineProject'),
            isCompleted: isProjectDefined,
            href: '/account/project'
        },
        {
            id: 'identity',
            label: t('steps.confirmIdentity'),
            isCompleted: isIdentityConfirmed,
            href: '/account/personal-info'
        },
        {
            id: 'dossier',
            label: t('steps.completeDossier'),
            isCompleted: isDossierCompleted,
            href: '/account/tenant-profile'
        }
    ];

    const completedCount = steps.filter(s => s.isCompleted).length;
    const progress = (completedCount / steps.length) * 100;

    // Helper for Journey
    const mostRelevantApplication = useMemo(() => {
        if (!applications.length) return null;
        // Prioritize: Accepted > Visit > Sent
        const accepted = applications.find(a => a.status === 'ACCEPTED');
        if (accepted) return accepted;
        const visit = applications.find(a => ['VISIT_PROPOSED', 'VISIT_CONFIRMED'].includes(a.status));
        if (visit) return visit;
        return applications[0];
    }, [applications]);

    const getJourneyProgress = (status: string, leaseStatus: string) => {
        if (leaseStatus === 'SIGNED') return 100;
        if (status === 'ACCEPTED') return 75;
        if (['VISIT_PROPOSED', 'VISIT_CONFIRMED'].includes(status)) return 50;
        return 25;
    };

    const isStepCompleted = (stepStatus: string[], currentStatus: string, stepIdx: number) => {
        const statusOrder = ['SENT', 'VISIT_PROPOSED', 'ACCEPTED', 'SIGNED']; // Simplified
        // Map currentStatus to index
        let currentIdx = 0;
        if (currentStatus === 'ACCEPTED') currentIdx = 2;
        else if (['VISIT_PROPOSED', 'VISIT_CONFIRMED'].includes(currentStatus)) currentIdx = 1;

        return currentIdx >= stepIdx;
    };

    const isStepActive = (stepStatus: string[], currentStatus: string, stepIdx: number) => {
        return stepStatus.includes(currentStatus);
    };

    return (
        <Container>
            <div className="pb-20">
                <PageHeader
                    title={t('title')}
                    subtitle={t('tenantSubtitle')}
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
                                    {t('myApplications')}
                                </div>
                                <div className="text-neutral-500 text-sm">
                                    {activeApplicationsCount > 0
                                        ? t('applicationsCount', { count: activeApplicationsCount })
                                        : t('noApplications')
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
                                {t('upcomingVisits')}
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

                    {/* Application Journey or Dossier Progress */}
                    {mostRelevantApplication ? (
                        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-medium">{t('applicationTracking')}</h2>
                                <span className="text-sm text-neutral-500">{mostRelevantApplication.listing?.title}</span>
                            </div>

                            <div className="relative flex items-center justify-between w-full">
                                {/* Progress Line */}
                                <div className="absolute top-1/2 left-0 w-full h-1 bg-neutral-100 -z-10 -translate-y-1/2 rounded-full"></div>
                                <div
                                    className="absolute top-1/2 left-0 h-1 bg-green-500 -z-10 -translate-y-1/2 rounded-full transition-all duration-1000"
                                    style={{ width: `${getJourneyProgress(mostRelevantApplication.status, mostRelevantApplication.leaseStatus)}%` }}
                                ></div>

                                {/* Steps */}
                                {[
                                    { label: t('journey.sent'), status: ['SENT', 'PENDING'] },
                                    { label: t('journey.visit'), status: ['VISIT_PROPOSED', 'VISIT_CONFIRMED'] },
                                    { label: t('journey.validation'), status: ['ACCEPTED'] },
                                    { label: t('journey.lease'), status: ['SIGNED'] } // Lease status check needed
                                ].map((step, idx) => {
                                    const isActive = isStepActive(step.status, mostRelevantApplication.status, idx);
                                    const isCompleted = isStepCompleted(step.status, mostRelevantApplication.status, idx);

                                    return (
                                        <div key={idx} className="flex flex-col items-center gap-2 bg-white px-2">
                                            <div className={`
                                                w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all
                                                ${isActive || isCompleted ? 'border-green-500 bg-green-50 text-green-600' : 'border-neutral-200 text-neutral-300'}
                                             `}>
                                                {isCompleted ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                            </div>
                                            <span className={`text-xs font-medium ${isActive || isCompleted ? 'text-neutral-900' : 'text-neutral-400'}`}>
                                                {step.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-8 flex justify-end">
                                <Link href={`/dashboard/applications/${mostRelevantApplication.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                                    {t('viewDetails')}
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                            <div className="mb-6">
                                <h2 className="text-xl font-medium mb-2">
                                    {t('prepareDossier')}
                                </h2>
                                <p className="text-neutral-500 text-sm mb-4">
                                    {t('dossierHint')}
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
                    )}
                </div>
            </div>
        </Container>
    );
}

export default TenantDashboardClient;
