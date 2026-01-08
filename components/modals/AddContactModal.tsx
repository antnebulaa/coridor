'use client';

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Avatar from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import Heading from "@/components/Heading";
import CustomToast from "../ui/CustomToast";
import Modal from "./Modal";

interface AddContactModalProps {
    code: string | null;
    isOpen: boolean;
    onClose: () => void;
}

const AddContactModal: React.FC<AddContactModalProps> = ({
    code,
    isOpen,
    onClose
}) => {
    const router = useRouter();
    const [targetUser, setTargetUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (!code || !isOpen) return;

        setIsLoading(true);
        axios.get(`/api/users/${code}`)
            .then((response) => {
                setTargetUser(response.data);
            })
            .catch((error) => {
                console.error(error);
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Utilisateur introuvable ou code invalide."
                        type="error"
                    />
                ));
                onClose();
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [code, isOpen, onClose]);

    const handleAdd = useCallback(() => {
        if (!code) return;

        setIsAdding(true);
        axios.post('/api/contacts', { code })
            .then(() => {
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Contact ajouté !"
                        type="success"
                    />
                ));
                router.refresh();
                onClose();
            })
            .catch((error) => {
                const message = error.response?.data || "Erreur lors de l'ajout.";
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message={message}
                        type="error"
                    />
                ));
            })
            .finally(() => {
                setIsAdding(false);
            });
    }, [code, router, onClose]);

    let bodyContent = (
        <div className="flex flex-col items-center justify-center min-h-[300px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    let footerContent;

    if (!isLoading && targetUser) {
        bodyContent = (
            <div className="flex flex-col items-center gap-4">
                <Heading
                    title="Ajouter un contact"
                    subtitle={`Voulez-vous ajouter ${targetUser.name || 'cet utilisateur'}\nà vos contacts ?`}
                    center
                />

                <div className="flex flex-col items-center gap-2 mt-4">
                    <Avatar src={targetUser.image} size={150} />
                    <div className="text-xl font-semibold capitalize mt-2">
                        {targetUser.name}
                    </div>
                </div>
            </div>
        );

        footerContent = (
            <div className="flex flex-col gap-3 w-full mt-4">
                <Button
                    label="Annuler"
                    onClick={onClose}
                    className="rounded-full bg-neutral-100 border-none hover:bg-neutral-200 text-neutral-800"
                />
                <Button
                    label={
                        targetUser.isSelf
                            ? "C'est vous !"
                            : targetUser.isContact
                                ? "Déjà ajouté"
                                : isAdding
                                    ? "Ajout..."
                                    : "Ajouter"
                    }
                    onClick={handleAdd}
                    disabled={isAdding || targetUser.isSelf || targetUser.isContact}
                    className="rounded-full"
                />
            </div>
        )
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={() => { }}
            actionLabel="" // No default footer actions
            secondaryActionLabel={undefined}
            title="Nouveau contact"
            body={bodyContent}
            footer={footerContent}
        />
    );
};

export default AddContactModal;
