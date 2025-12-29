'use client';

import { useRouter } from "next/navigation";
import Modal from "./Modal";
import { ClipboardCheck } from "lucide-react";

interface IncompleteProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const IncompleteProfileModal: React.FC<IncompleteProfileModalProps> = ({
    isOpen,
    onClose
}) => {
    const router = useRouter();

    const bodyContent = (
        <div className="flex flex-col gap-4 items-center text-center p-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <ClipboardCheck size={40} className="text-green-600" />
            </div>
            <div className="text-xl font-bold">
                Vous y êtes presque !
            </div>
            <div className="text-neutral-500">
                Pour garantir la sécurité et la qualité des échanges, les propriétaires demandent un dossier complet avant toute visite. Cela ne prend que quelques minutes.
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={() => window.location.assign('/account/tenant-profile')}
            actionLabel="Compléter mon dossier"
            secondaryAction={onClose}
            secondaryActionLabel="Plus tard"
            title=""
            body={bodyContent}
            hideHeader
        />
    );
}

export default IncompleteProfileModal;
