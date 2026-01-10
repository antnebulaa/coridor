'use client';

import { useState, useRef } from 'react';
import BottomSheet from '@/components/ui/BottomSheet';
import { HiPhoto, HiCamera } from 'react-icons/hi2';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

interface MobileImageUploadProps {
    onUpload: (url: string) => void;
}

const MobileImageUpload: React.FC<MobileImageUploadProps> = ({ onUpload }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Refs for hidden inputs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        // Toast is handled by parent usually, but we can show loading here
        const loadingToast = toast.loading('Envoi de l\'image...');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'coridor-preset');

            const response = await axios.post(
                `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
                formData
            );

            const url = response.data.secure_url;
            onUpload(url);
            setIsOpen(false);
            toast.dismiss(loadingToast);
            // toast.success('Image envoyée'); // Optional, maybe redundant with message appearing
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Erreur lors de l\'envoi');
            toast.dismiss(loadingToast);
        } finally {
            setUploading(false);
            // Reset inputs
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (cameraInputRef.current) cameraInputRef.current.value = '';
        }
    };

    const triggerFile = () => fileInputRef.current?.click();
    const triggerCamera = () => cameraInputRef.current?.click();

    return (
        <>
            {/* Hidden Inputs */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
            />
            <input
                type="file"
                ref={cameraInputRef}
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
            />

            <BottomSheet
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                trigger={
                    <button
                        onClick={() => setIsOpen(true)}
                        className="p-2 -ml-2 text-primary hover:bg-neutral-100 rounded-full transition"
                    >
                        <HiPhoto size={30} />
                    </button>
                }
            >
                <div className="px-4 pb-4">
                    <div className="flex flex-col">

                        <button
                            onClick={triggerFile}
                            disabled={uploading}
                            className="flex items-center gap-3 p-[9px] hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl cursor-pointer transition group w-full text-left"
                        >
                            <div className="
                                        w-10 h-10 
                                        relative 
                                        rounded-xl 
                                        overflow-hidden 
                                        bg-neutral-100 
                                        flex items-center justify-center
                                        shrink-0
                                    ">
                                <HiPhoto size={20} className="text-neutral-500" />
                            </div>
                            <div className="flex-1 flex flex-col">
                                <span className="font-medium text-[18px] md:text-base text-neutral-900 dark:text-white">Gallerie photo</span>
                                <span className="text-sm text-neutral-500">Choisir depuis votre bibliothèque</span>
                            </div>
                            {uploading && <AiOutlineLoading3Quarters className="animate-spin ml-auto" />}
                        </button>

                        <button
                            onClick={triggerCamera}
                            disabled={uploading}
                            className="flex items-center gap-3 p-[9px] hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl cursor-pointer transition group w-full text-left"
                        >
                            <div className="
                                        w-10 h-10 
                                        relative 
                                        rounded-xl 
                                        overflow-hidden 
                                        bg-neutral-100 
                                        flex items-center justify-center
                                        shrink-0
                                    ">
                                <HiCamera size={20} className="text-neutral-500" />
                            </div>
                            <div className="flex-1 flex flex-col">
                                <span className="font-medium text-[18px] md:text-base text-neutral-900 dark:text-white">Appareil photo</span>
                                <span className="text-sm text-neutral-500">Prendre une nouvelle photo</span>
                            </div>
                        </button>
                    </div>

                    <div className="mt-4 px-2">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full py-3 font-semibold text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white transition"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            </BottomSheet>
        </>
    );
}

export default MobileImageUpload;
