'use client';

import { Link } from '@/i18n/navigation';
import { SafeUser } from '@/types';
import { ActionItem } from '@/app/actions/getOperationalStats';
import Avatar from '@/components/Avatar';

interface DashboardHeaderProps {
    currentUser: SafeUser;
    actionItems: ActionItem[];
    totalUnits: number;
    occupiedUnits: number;
}

function getContextMessage(actionItems: ActionItem[]): string {
    const urgent = actionItems.filter(a => a.priority === 'URGENT');
    const actions = actionItems.filter(a => a.priority === 'ACTION');

    // Priority 1: urgent items
    const overdueRents = urgent.filter(a => a.type === 'OVERDUE_RENT');
    if (overdueRents.length > 0) {
        return `${overdueRents.length} loyer${overdueRents.length > 1 ? 's' : ''} en retard`;
    }
    const urgentReminders = urgent.filter(a => a.type === 'LEGAL_REMINDER');
    if (urgentReminders.length > 0) {
        return `${urgentReminders.length} rappel${urgentReminders.length > 1 ? 's' : ''} légal${urgentReminders.length > 1 ? 'aux' : ''} à traiter`;
    }
    const overdueDeposits = urgent.filter(a => a.type === 'DEPOSIT_DEADLINE');
    if (overdueDeposits.length > 0) {
        return 'Dépôt de garantie à restituer';
    }

    // Priority 2: action items
    const pendingApps = actions.filter(a => a.type === 'PENDING_APPLICATION');
    if (pendingApps.length > 0) {
        const total = pendingApps.reduce((sum, a) => {
            const match = a.title.match(/^(\d+)/);
            return sum + (match ? parseInt(match[1]) : 1);
        }, 0);
        return `${total} candidature${total > 1 ? 's' : ''} à examiner`;
    }
    const pendingEdls = actions.filter(a => a.type === 'PENDING_EDL');
    if (pendingEdls.length > 0) {
        return 'Un état des lieux à finaliser';
    }
    const visits = actionItems.filter(a => a.type === 'UPCOMING_VISIT');
    if (visits.length > 0) {
        return visits[0].title;
    }

    // Priority 3: all good
    return 'Tout est en ordre';
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    currentUser,
    actionItems,
    totalUnits,
    occupiedUnits,
}) => {
    const message = getContextMessage(actionItems);

    return (
        <div className="flex items-start justify-between gap-4">
            <div>
                <h1 className="text-2xl font-medium text-neutral-900 dark:text-white">
                    Bonjour {currentUser.firstName || 'propriétaire'} 👋
                </h1>
                <p className="text-base text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {message}
                </p>
                <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
                    {totalUnits} logement{totalUnits > 1 ? 's' : ''} · {occupiedUnits} occupé{occupiedUnits > 1 ? 's' : ''}
                </p>
            </div>
            <Link
                href="/account"
                aria-label="Mon compte"
                className="shrink-0"
            >
                <Avatar src={currentUser.image} seed={currentUser.email || currentUser.name} size={40} />
            </Link>
        </div>
    );
};

export default DashboardHeader;
