'use client';

import { SafeUser } from "@/types";
import { useRouter } from "next/navigation";
import Container from "@/components/Container";
import { CheckCircle2, Circle, FolderOpen, Calendar, Bell, FileText, Receipt, ChevronRight, Shield, ArrowRight, BellRing, Home } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import VisitCard from "./components/VisitCard";
// import SubscriptionCarousel from "./components/SubscriptionCarousel";
import { useTranslations } from 'next-intl';
import PassportCard from "@/components/passport/PassportCard";
import usePassportCompletion from "@/hooks/usePassportCompletion";
import { useMoveInGuide } from "@/hooks/useMoveInGuide";
import { getCompletedCount } from "@/lib/moveInGuide";

interface TenantDashboardClientProps {
    currentUser: SafeUser;
    rentalProject: any;
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

    // Passport completion (progressive disclosure)
    const { data: passportCompletion, isLoading: passportLoading } = usePassportCompletion();

    // Active Applications Count
    const activeApplicationsCount = applications.filter(app =>
        ['PENDING', 'SENT', 'VISIT_PROPOSED', 'VISIT_CONFIRMED', 'ACCEPTED'].includes(app.status)
    ).length;

    // Responses received (non-PENDING, non-SENT statuses)
    const responsesCount = applications.filter(app =>
        ['VISIT_PROPOSED', 'VISIT_CONFIRMED', 'ACCEPTED', 'REJECTED'].includes(app.status)
    ).length;

    // Next visit (closest upcoming, CONFIRMED first)
    const nextVisit = useMemo(() => {
        const now = new Date();
        const upcoming = visits
            .filter(v => new Date(v.date || v.startTime) >= now)
            .sort((a, b) => {
                // CONFIRMED first
                if (a.status === 'CONFIRMED' && b.status !== 'CONFIRMED') return -1;
                if (b.status === 'CONFIRMED' && a.status !== 'CONFIRMED') return 1;
                return new Date(a.date || a.startTime).getTime() - new Date(b.date || b.startTime).getTime();
            });
        return upcoming[0] || null;
    }, [visits]);

    // Dossier progress
    const isAccountCreated = true;
    const isProjectDefined = useMemo(() => !!rentalProject, [rentalProject]);
    const isIdentityConfirmed = useMemo(() => !!(
        currentUser.firstName && currentUser.lastName && currentUser.phoneNumber &&
        currentUser.address && currentUser.zipCode && currentUser.city &&
        currentUser.birthDate && currentUser.birthPlace
    ), [currentUser]);
    const isDossierCompleted = useMemo(() => {
        if (!tenantProfile) return false;
        const hasSelfInfo = !!tenantProfile.netSalary && !!tenantProfile.jobTitle;
        if (!hasSelfInfo) return false;
        if (rentalProject?.compositionType === 'COUPLE') {
            if (!tenantProfile.partnerNetSalary || !tenantProfile.partnerJobTitle) return false;
        }
        return true;
    }, [tenantProfile, rentalProject]);

    const steps = [
        { id: 'account', label: t('steps.createAccount'), isCompleted: isAccountCreated, href: '/account/profile' },
        { id: 'project', label: t('steps.defineProject'), isCompleted: isProjectDefined, href: '/account/project' },
        { id: 'identity', label: t('steps.confirmIdentity'), isCompleted: isIdentityConfirmed, href: '/account/personal-info' },
        { id: 'dossier', label: t('steps.completeDossier'), isCompleted: isDossierCompleted, href: '/account/tenant-profile' }
    ];
    const completedCount = steps.filter(s => s.isCompleted).length;
    const progress = (completedCount / steps.length) * 100;

    // Journey helpers
    const mostRelevantApplication = useMemo(() => {
        if (!applications.length) return null;
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
        let currentIdx = 0;
        if (currentStatus === 'ACCEPTED') currentIdx = 2;
        else if (['VISIT_PROPOSED', 'VISIT_CONFIRMED'].includes(currentStatus)) currentIdx = 1;
        return currentIdx >= stepIdx;
    };

    const isStepActive = (stepStatus: string[], currentStatus: string) => {
        return stepStatus.includes(currentStatus);
    };

    // Format visit date
    const formatVisitDate = (visit: any) => {
        const date = new Date(visit.date || visit.startTime);
        const day = date.getDate();
        const month = date.toLocaleDateString('fr-FR', { month: 'short' });
        const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        return { day, month, time };
    };

    // Active lease (signed)
    const activeLease = useMemo(() => {
        return applications.find((app: any) => app.leaseStatus === 'SIGNED') || null;
    }, [applications]);

    // Move-in guide (for banner)
    const { guide: moveInGuide } = useMoveInGuide(activeLease?.id);
    const moveInProgress = moveInGuide ? getCompletedCount(moveInGuide.steps) : 0;
    const moveInTotal = moveInGuide?.steps.length || 8;

    const leaseDisplayInfo = useMemo(() => {
        if (!activeLease) return null;

        const listing = activeLease.listing;
        const unit = listing?.rentalUnit;
        const property = unit?.property;

        // Photo
        const photo = property?.images?.[0]?.url || unit?.images?.[0]?.url || null;

        // Category shortname
        const categoryMap: Record<string, string> = {
            'apartment': 'Apt',
            'house': 'Maison',
            'studio': 'Studio',
            'loft': 'Loft',
            'room': 'Chambre',
        };
        const rawCategory = (property?.category || '').toLowerCase();
        const category = categoryMap[rawCategory] || property?.category || 'Logement';

        // Location
        const city = property?.city || '';

        // Surface
        const surface = unit?.surface || property?.totalSurface || null;

        // Next rent date (1st of next month)
        const now = new Date();
        const nextRentDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const nextRentLabel = `1er ${nextRentDate.toLocaleDateString('fr-FR', { month: 'long' })}`;

        return { photo, category, city, surface, nextRentLabel, listingTitle: listing?.title };
    }, [activeLease]);

    const firstName = currentUser.firstName || currentUser.name?.split(' ')[0] || '';

    return (
        <Container>
            <div className="pb-20">
                <div className="max-w-2xl mx-auto mt-6 flex flex-col gap-5">

                    {/* === HEADER === */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-2xl font-medium text-neutral-900 dark:text-neutral-100">
                                Bonjour {firstName} 👋
                            </h1>
                            <p className="text-sm text-neutral-500 mt-0.5">
                                {activeApplicationsCount > 0
                                    ? `${activeApplicationsCount} candidature${activeApplicationsCount > 1 ? 's' : ''} en cours`
                                    : 'Aucune candidature en cours'
                                }
                            </p>
                        </div>
                        <Link
                            href="/notifications"
                            className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                        >
                            <Bell size={20} className="text-neutral-600 dark:text-neutral-400" />
                        </Link>
                    </div>

                    {/* === STATS RAPIDES === */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Candidatures */}
                        <Link
                            href="/dashboard/applications"
                            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 hover:shadow-md transition group animate-pulse"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <FolderOpen size={16} className="text-neutral-400" />
                                <span className="text-sm font-medium text-neutral-500">Candidatures</span>
                            </div>
                            <div className="text-3xl font-medium text-neutral-800 dark:text-neutral-100">
                                {activeApplicationsCount}
                            </div>
                            <div className="text-xs text-neutral-500 mt-1">
                                {responsesCount > 0
                                    ? `${responsesCount} réponse${responsesCount > 1 ? 's' : ''} reçue${responsesCount > 1 ? 's' : ''}`
                                    : 'En attente de réponses'
                                }
                            </div>
                        </Link>

                        {/* Prochain RDV */}
                        <Link
                            href="/calendar"
                            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 hover:shadow-md transition group animate-pulse"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar size={16} className="text-neutral-400" />
                                <span className="text-sm font-medium text-neutral-500">Prochain RDV</span>
                            </div>
                            {nextVisit ? (
                                <>
                                    <div className="text-3xl font-medium text-neutral-800 dark:text-neutral-100">
                                        {formatVisitDate(nextVisit).day} {formatVisitDate(nextVisit).month}
                                    </div>
                                    <div className="text-sm text-neutral-500 mt-1">
                                        {formatVisitDate(nextVisit).time} · {nextVisit.listing?.title || 'Visite'}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="text-3xl font-medium text-neutral-900 dark:text-neutral-100">0</div>
                                    <div className="text-xs text-neutral-500 mt-1">Aucune visite prévue</div>
                                </>
                            )}
                        </Link>
                    </div>

                    {/* === MON LOGEMENT ACTUEL === */}
                    {activeLease && leaseDisplayInfo ? (
                        <Link
                            href="/dashboard/my-rental"
                            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex gap-4 hover:shadow-md transition group"
                        >
                            <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                                {leaseDisplayInfo.photo ? (
                                    <img
                                        src={leaseDisplayInfo.photo}
                                        alt={leaseDisplayInfo.listingTitle || 'Logement'}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Home size={24} className="text-neutral-400" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                                    {leaseDisplayInfo.category}
                                    {leaseDisplayInfo.city && ` · ${leaseDisplayInfo.city}`}
                                    {leaseDisplayInfo.surface && ` · ${leaseDisplayInfo.surface}m²`}
                                </div>
                                <div className="text-xs text-neutral-500 mt-1">
                                    Bail actif · Prochain loyer : {leaseDisplayInfo.nextRentLabel}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    <CheckCircle2 size={14} className="text-green-500" />
                                    <span className="text-xs font-medium text-green-600 dark:text-green-400">À jour</span>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-neutral-400 group-hover:text-neutral-600 transition shrink-0 self-center" />
                        </Link>
                    ) : activeApplicationsCount > 0 ? (
                        /* Option A: Show candidatures summary */
                        <Link
                            href="/dashboard/applications"
                            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex gap-4 hover:shadow-md transition group"
                        >
                            <div className="shrink-0 w-20 h-20 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                <FolderOpen size={24} className="text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                    Vos candidatures
                                </div>
                                <div className="text-xs text-neutral-500 mt-1">
                                    {activeApplicationsCount} candidature{activeApplicationsCount > 1 ? 's' : ''} en cours
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-neutral-400 group-hover:text-neutral-600 transition shrink-0 self-center" />
                        </Link>
                    ) : (
                        /* Option B: CTA to search */
                        <Link
                            href="/dashboard/my-rental"
                            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex gap-4 hover:shadow-md transition group"
                        >
                            <div className="shrink-0 w-20 h-20 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                                <Home size={24} className="text-neutral-300 dark:text-neutral-600" />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                    Mon logement
                                </div>
                                <div className="text-xs text-neutral-400 mt-1">
                                    Pas encore de bail actif
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-neutral-400 group-hover:text-neutral-600 transition shrink-0 self-center" />
                        </Link>
                    )}

                    {/* === MOVE-IN GUIDE BANNER === */}
                    {moveInGuide && activeLease && (
                        <Link
                            href="/dashboard/my-rental"
                            className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/50 rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition group"
                        >
                            <span className="text-2xl">🎉</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                    {!moveInGuide.storiesShownAt ? 'Votre bail est signé !' : 'Emménagement en cours'}
                                </p>
                                <p className="text-xs text-neutral-500 mt-0.5">
                                    {!moveInGuide.storiesShownAt
                                        ? 'Découvrez les étapes pour votre emménagement'
                                        : `${moveInProgress}/${moveInTotal} étapes complétées`
                                    }
                                </p>
                            </div>
                            <ChevronRight size={18} className="text-amber-400 group-hover:text-amber-600 transition shrink-0" />
                        </Link>
                    )}

                    {/* === PASSEPORT LOCATIF (progressive disclosure) === */}
                    {passportLoading ? (
                        <div
                            className="rounded-3xl p-5 animate-pulse"
                            style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%)' }}
                        >
                            <div className="h-4 w-32 bg-white/10 rounded mb-3" />
                            <div className="h-6 w-48 bg-white/10 rounded mb-2" />
                            <div className="h-4 w-full bg-white/10 rounded" />
                        </div>
                    ) : passportCompletion ? (
                        <PassportCard completionData={passportCompletion} />
                    ) : null}

                    {/* === ACCES RAPIDE === */}
                    <div>
                        
                        <div className="grid grid-cols-3 gap-3">
                            <Link
                                href="/account/tenant-profile"
                                className="bg-neutral-100 dark:bg-neutral-900  rounded-2xl p-4 flex flex-col items-start gap-2 hover:shadow-md transition"
                            >
                                <div className="p-2 bg-blue-600 dark:bg-blue-900/30 rounded-full">
                                    <FileText size={14} className="text-white dark:text-blue-400" />
                                </div>
                                <span className="text-base font-medium text-neutral-700 dark:text-neutral-300 text-leftr">Dossier</span>
                            </Link>
                            <Link
                                href="/account/receipts"
                                className="bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-4 flex flex-col items-start gap-2 hover:shadow-md transition"
                            >
                                <div className="p-2 bg-amber-600 dark:bg-amber-900/30 rounded-full">
                                    <Receipt size={14} className="text-white dark:text-amber-400" />
                                </div>
                                <span className="text-base font-medium text-neutral-700 dark:text-neutral-300 text-left">Quittances</span>
                            </Link>
                            <Link
                                href="/account/alerts"
                                className="bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-4 flex flex-col items-start gap-2 hover:shadow-md transition"
                            >
                                <div className="p-2 bg-purple-600 dark:bg-purple-900/30 rounded-full">
                                    <BellRing size={14} className="text-white dark:text-purple-400" />
                                </div>
                                <span className="text-base font-medium text-neutral-700 dark:text-neutral-300 text-left">Alertes</span>
                            </Link>
                        </div>
                    </div>

                    {/* === APPLICATION JOURNEY OR DOSSIER PROGRESS === */}
                    {mostRelevantApplication ? (
                        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-medium">{t('applicationTracking')}</h2>
                                <span className="text-sm text-neutral-500 truncate max-w-[140px]">{mostRelevantApplication.listing?.title}</span>
                            </div>

                            <div className="relative flex items-center justify-between w-full">
                                <div className="absolute top-1/2 left-0 w-full h-1 bg-neutral-100 dark:bg-neutral-800 -z-10 -translate-y-1/2 rounded-full" />
                                <div
                                    className="absolute top-1/2 left-0 h-1 bg-green-500 -z-10 -translate-y-1/2 rounded-full transition-all duration-1000"
                                    style={{ width: `${getJourneyProgress(mostRelevantApplication.status, mostRelevantApplication.leaseStatus)}%` }}
                                />

                                {[
                                    { label: t('journey.sent'), status: ['SENT', 'PENDING'] },
                                    { label: t('journey.visit'), status: ['VISIT_PROPOSED', 'VISIT_CONFIRMED'] },
                                    { label: t('journey.validation'), status: ['ACCEPTED'] },
                                    { label: t('journey.lease'), status: ['SIGNED'] }
                                ].map((step, idx) => {
                                    const active = isStepActive(step.status, mostRelevantApplication.status);
                                    const completed = isStepCompleted(step.status, mostRelevantApplication.status, idx);
                                    return (
                                        <div key={idx} className="flex flex-col items-center gap-2 bg-white dark:bg-neutral-900 px-2">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all
                                                ${active || completed ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-600' : 'border-neutral-200 dark:border-neutral-700 text-neutral-300'}`}>
                                                {completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                            </div>
                                            <span className={`text-xs font-medium ${active || completed ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400'}`}>
                                                {step.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-6 flex justify-end">
                                <Link href={`/dashboard/applications/${mostRelevantApplication.id}`} className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                                    {t('viewDetails')} <ArrowRight size={14} />
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                            <div className="mb-6">
                                <h2 className="text-lg font-medium mb-2">{t('prepareDossier')}</h2>
                                <p className="text-neutral-500 text-sm mb-4">{t('dossierHint')}</p>
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                        <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
                                    </div>
                                    <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-3">
                                {steps.map((step) => (
                                    <Link
                                        key={step.id}
                                        href={step.href}
                                        className={`flex items-center gap-3 p-3 rounded-xl transition
                                            ${step.isCompleted ? 'bg-secondary/50' : 'bg-white dark:bg-neutral-900 border border-border hover:border-primary/50 hover:shadow-sm'}`}
                                    >
                                        <div className={`shrink-0 ${step.isCompleted ? 'text-green-500' : 'text-neutral-300'}`}>
                                            {step.isCompleted ? <CheckCircle2 size={24} className="fill-green-100" /> : <Circle size={24} />}
                                        </div>
                                        <div className={`font-medium ${step.isCompleted ? 'text-neutral-500 line-through' : 'text-foreground'}`}>
                                            {step.label}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* === SUBSCRIPTION (hidden for now) === */}
                    {/* <SubscriptionCarousel /> */}
                </div>
            </div>
        </Container>
    );
}

export default TenantDashboardClient;
