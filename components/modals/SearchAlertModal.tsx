'use client';

import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { BellPlus } from 'lucide-react';
import Modal from '../modals/Modal';

import useLoginModal from '@/hooks/useLoginModal';
import { SafeUser } from '@/types';

interface SearchAlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser?: SafeUser | null;
    currentSearch?: {
        locationValue?: string;
        category?: string;
        roomCount?: number;
        minPrice?: number;
        maxPrice?: number;
    }
}

const SearchAlertModal: React.FC<SearchAlertModalProps> = ({
    isOpen,
    onClose,
    currentUser,
    currentSearch
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const loginModal = useLoginModal();

    // Initialize with current search, or empty defaults
    // If no search is active, user creates a generic alert?
    // Usually they want to save CURRENT criteria.

    const location = currentSearch?.locationValue || authLocation();

    // Quick helper to display criteria
    const criteriaList = [
        currentSearch?.locationValue && `Lieu : ${currentSearch.locationValue}`,
        currentSearch?.category && `Catégorie : ${currentSearch.category}`,
        currentSearch?.minPrice && `Min : ${currentSearch.minPrice}€`,
        currentSearch?.maxPrice && `Max : ${currentSearch.maxPrice}€`,
        currentSearch?.roomCount && `Pièces : ${currentSearch.roomCount}+`,
    ].filter(Boolean);

    function authLocation() {
        return "";
    }

    const onSubmit = async () => {
        if (!currentUser) {
            return loginModal.onOpen();
        }

        setIsLoading(true);

        try {
            await axios.post('/api/alerts', {
                ...currentSearch
            });
            toast.success('Alerte créée ! Vous recevrez un email.');
            onClose();
        } catch (error) {
            toast.error("Erreur lors de la création de l'alerte.");
        } finally {
            setIsLoading(false);
        }
    }

    // Since we are reusing the Modal component structure (which manages isOpen internally often, or via props), 
    // but here I'm using a custom implementation or importing it?
    // I imported `Modal` from `../modals/Modal`.
    // I need to check how `Modal` works. 
    // Usually it accepts `isOpen`, `onClose`, `title`, `body`, `actionLabel`, `disabled`, `secondaryAction`, `secondaryActionLabel`.

    // I will use standard props based on common patterns.

    const bodyContent = (
        <div className="flex flex-col gap-4">
            <div className="text-center">
                <div className="rounded-full bg-rose-100 dark:bg-rose-900/30 p-4 inline-block mb-4">
                    <BellPlus className="text-rose-500 dark:text-rose-400 w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold mb-2">Ne manquez aucune annonce</h2>
                <p className="text-neutral-500 dark:text-neutral-400">
                    Recevez une notification par email dès qu'une annonce correspond à vos critères :
                </p>
            </div>

            <div className="bg-neutral-50 p-4 rounded-lg space-y-2">
                {criteriaList.length > 0 ? (
                    criteriaList.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-neutral-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            {c}
                        </div>
                    ))
                ) : (
                    <div className="text-sm text-neutral-500 italic">
                        Tous les nouveaux biens (pas de filtres sélectionnés)
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={onSubmit}
            title="Créer une alerte"
            actionLabel={isLoading ? "Création..." : "M'alerter"}
            disabled={isLoading}
            body={bodyContent}
        />
    );
}

export default SearchAlertModal;
