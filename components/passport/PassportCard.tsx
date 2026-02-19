'use client';

import { useState } from 'react';
import { PassportCompletionData } from '@/lib/passportCompletion';
import PassportCardDiscovery from './PassportCardDiscovery';
import PassportCardInProgress from './PassportCardInProgress';
import PassportCardAdvanced from './PassportCardAdvanced';
import PassportCardComplete from './PassportCardComplete';
import PassportExplainerModal from './PassportExplainerModal';

interface PassportCardProps {
    completionData: PassportCompletionData;
}

const PassportCard: React.FC<PassportCardProps> = ({ completionData }) => {
    const [showExplainer, setShowExplainer] = useState(false);

    const onOpenExplainer = () => setShowExplainer(true);

    return (
        <>
            {(() => {
                switch (completionData.state) {
                    case 'discovery':
                        return <PassportCardDiscovery onOpenExplainer={onOpenExplainer} />;
                    case 'in_progress':
                        return <PassportCardInProgress data={completionData} onOpenExplainer={onOpenExplainer} />;
                    case 'advanced':
                        return <PassportCardAdvanced data={completionData} onOpenExplainer={onOpenExplainer} />;
                    case 'complete':
                        return <PassportCardComplete data={completionData} onOpenExplainer={onOpenExplainer} />;
                }
            })()}
            <PassportExplainerModal open={showExplainer} onClose={() => setShowExplainer(false)} />
        </>
    );
};

export default PassportCard;
