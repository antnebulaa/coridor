'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Users, BarChart3, Star } from 'lucide-react';
import Container from '@/components/Container';
import PageHeader from '@/components/PageHeader';
import CandidateComparator, { CandidateData } from '@/app/[locale]/components/selection/CandidateComparator';

interface SelectionClientProps {
    listingId: string;
    listingTitle: string;
    listingPrice: number;
    candidates: CandidateData[];
    totalEvaluated: number;
    shortlisted: number;
}

const SelectionClient: React.FC<SelectionClientProps> = ({
    listingId,
    listingTitle,
    listingPrice,
    candidates,
    totalEvaluated,
    shortlisted,
}) => {
    const router = useRouter();

    const handleSelectCandidate = useCallback(async (applicationId: string) => {
        try {
            await axios.post(`/api/applications/${applicationId}/advance`, {
                targetStatus: 'SELECTED',
            });
            toast.success('Candidat selectionne avec succes !');
            // Redirect after short delay to let the success state show
            setTimeout(() => {
                router.push('/dashboard');
                router.refresh();
            }, 2000);
        } catch (error: any) {
            const message = error?.response?.data?.error || 'Une erreur est survenue';
            toast.error(message);
            throw error; // Re-throw so the comparator can handle the error state
        }
    }, [router]);

    return (
        <Container>
            <div className="pb-20">
                <PageHeader
                    title={`Selection : ${listingTitle}`}
                    subtitle="Comparez vos candidats et choisissez votre locataire"
                    showBack
                    backLabel="Tableau de bord"
                />

                {/* Stats bar */}
                <div className="max-w-6xl mx-auto mt-6 mb-6">
                    <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-neutral-50 rounded-full border border-neutral-200">
                            <Users size={16} className="text-neutral-500" />
                            <span className="text-sm font-medium text-neutral-700">
                                {totalEvaluated} candidat{totalEvaluated > 1 ? 's' : ''} evalue{totalEvaluated > 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full border border-green-200">
                            <Star size={16} className="text-green-600" />
                            <span className="text-sm font-medium text-green-700">
                                {shortlisted} shortliste{shortlisted > 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-200">
                            <BarChart3 size={16} className="text-blue-600" />
                            <span className="text-sm font-medium text-blue-700">
                                {listingPrice} EUR/mois
                            </span>
                        </div>
                    </div>
                </div>

                {/* Comparator */}
                <div className="max-w-6xl mx-auto">
                    <CandidateComparator
                        listingId={listingId}
                        listingTitle={listingTitle}
                        listingPrice={listingPrice}
                        candidates={candidates}
                        onSelectCandidate={handleSelectCandidate}
                    />
                </div>
            </div>
        </Container>
    );
};

export default SelectionClient;
