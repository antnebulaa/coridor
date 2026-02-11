'use client';

import { SafeUser } from "@/types";
import PageHeader from "@/components/PageHeader";
import Container from "@/components/Container";
import { useState } from "react"; // Only useState needed if no complex effects
import { useTranslations } from 'next-intl';
import ApplicationCard from "./components/ApplicationCard";
import EmptyState from "@/components/EmptyState";

interface ApplicationsClientProps {
    currentUser: SafeUser;
    applications: any[];
}

const ApplicationsClient: React.FC<ApplicationsClientProps> = ({
    currentUser,
    applications = []
}) => {
    const t = useTranslations('dashboard.applicationsPage');
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

    const activeStatuses = ['PENDING', 'SENT', 'VISIT_PROPOSED', 'VISIT_CONFIRMED', 'ACCEPTED'];
    const archivedStatuses = ['REJECTED', 'CANCELLED']; // Add others if needed

    const filteredApplications = applications.filter(app => {
        if (activeTab === 'active') {
            return activeStatuses.includes(app.status);
        }
        return archivedStatuses.includes(app.status) || !activeStatuses.includes(app.status); // Default to archived for unknown
    });

    return (
        <Container>
            <div className="pb-20">
                <PageHeader
                    title={t('title')}
                    subtitle={t('subtitle')}
                    showBack
                    backLabel={useTranslations('dashboard')('title')}
                    backHref="/dashboard"
                />

                <div className="max-w-4xl mx-auto mt-8">
                    {/* Tabs */}
                    <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-1">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`
                                px-4 py-2 font-medium text-sm rounded-lg transition relative
                                ${activeTab === 'active'
                                    ? 'text-black bg-gray-100'
                                    : 'text-gray-500 hover:text-black hover:bg-gray-50'
                                }
                            `}
                        >
                            {t('active')}
                            {/* Counter */}
                            <span className="ml-2 px-1.5 py-0.5 bg-white rounded-md text-[10px] text-gray-500 shadow-sm border border-gray-100">
                                {applications.filter(a => activeStatuses.includes(a.status)).length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('archived')}
                            className={`
                                px-4 py-2 font-medium text-sm rounded-lg transition relative
                                ${activeTab === 'archived'
                                    ? 'text-black bg-gray-100'
                                    : 'text-gray-500 hover:text-black hover:bg-gray-50'
                                }
                            `}
                        >
                            {t('archived')}
                        </button>
                    </div>

                    {/* Content */}
                    {filteredApplications.length === 0 ? (
                        <div className="py-20 text-center">
                            <EmptyState
                                title={t('emptyTitle')}
                                subtitle={activeTab === 'active' ? t('emptyActive') : t('emptyArchived')}
                                showReset={false}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {filteredApplications.map((app) => (
                                <ApplicationCard
                                    key={app.id}
                                    application={app}
                                    currentUser={currentUser}
                                />
                            ))}
                        </div>
                    )}

                </div>
            </div>
        </Container>
    );
}

export default ApplicationsClient;
