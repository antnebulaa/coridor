'use client';

import axios from 'axios';
import { QRCodeCanvas } from 'qrcode.react';
import { useCallback, useState, useEffect } from "react";
import { toast } from 'react-hot-toast';
import { SafeUser } from '@/types';

import useMyCodeModal from "@/hooks/useMyCodeModal";
import Modal from "./Modal";
import Heading from "../Heading";
import { Button } from "../ui/Button";
import { useRouter } from "next/navigation";

interface MyCodeModalProps {
    currentUser?: SafeUser | null;
}

const MyCodeModal: React.FC<MyCodeModalProps> = ({ currentUser }) => {
    const myCodeModal = useMyCodeModal();
    const [isLoading, setIsLoading] = useState(false);
    const [baseUrl, setBaseUrl] = useState('http://192.168.1.38:3000');
    const router = useRouter();
    const uniqueCode = currentUser?.uniqueCode;

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const origin = window.location.origin;
            // Only update base url if we are not on localhost (e.g. production or specific IP access)
            // This ensures if I browse on localhost, the QR still points to the accessible IP for my phone
            if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
                setBaseUrl(origin);
            }
        }
    }, []);

    const qrValue = uniqueCode ? `${baseUrl}/contacts/add/${uniqueCode}` : '';

    const handleCopy = useCallback(() => {
        if (!uniqueCode) return;
        navigator.clipboard.writeText(uniqueCode);
        toast.success('Code copié !');
    }, [uniqueCode]);

    const onGenerate = useCallback(() => {
        setIsLoading(true);
        axios.post('/api/user/generate-code')
            .then(() => {
                toast.success('Code généré !');
                router.refresh();
            })
            .catch(() => {
                toast.error('Erreur lors de la génération');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [router]);

    if (!currentUser) {
        return null;
    }

    let bodyContent;

    if (!uniqueCode) {
        bodyContent = (
            <div className="flex flex-col items-center gap-8 justify-center min-h-[300px]">
                <Heading
                    title="Mon QR Code"
                    subtitle="Vous n'avez pas encore de code unique."
                    center
                />
                <Button
                    label="Générer mon code"
                    onClick={onGenerate}
                    disabled={isLoading}
                />
            </div>
        )
    } else {
        bodyContent = (
            <div className="flex flex-col items-center gap-8 justify-center">
                <Heading
                    title="Mon QR Code"
                    subtitle="Faites scanner ce code pour ajouter un contact"
                    center
                />
                <div className="p-6 bg-white rounded-xl shadow-lg border border-neutral-200">
                    <QRCodeCanvas
                        value={qrValue}
                        size={200}
                        level="H"
                    />
                </div>
                <div
                    className="
                        text-xl 
                        font-bold 
                        tracking-widest 
                        p-3 
                        bg-neutral-100 
                        rounded-lg 
                        cursor-pointer 
                        hover:bg-neutral-200 
                        transition 
                        flex 
                        flex-col 
                        items-center 
                        gap-1
                    "
                    onClick={handleCopy}
                    title="Cliquer pour copier"
                >
                    <span className="text-xs font-normal text-neutral-500 uppercase tracking-normal">Votre code unique</span>
                    {uniqueCode}
                </div>
            </div>
        );
    }

    return (
        <Modal
            isOpen={myCodeModal.isOpen}
            title="Ajouter un contact"
            actionLabel={uniqueCode ? "Fermer" : ""}
            onClose={myCodeModal.onClose}
            onSubmit={myCodeModal.onClose}
            body={bodyContent}
            secondaryActionLabel={undefined}
        />
    );
};

export default MyCodeModal;
