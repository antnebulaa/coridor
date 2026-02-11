'use client';

import { X } from 'lucide-react';
import Image from "next/image";

interface ImageModalProps {
    isOpen?: boolean;
    onClose: () => void;
    src?: string | null;
}

const ImageModal: React.FC<ImageModalProps> = ({
    isOpen,
    onClose,
    src
}) => {
    if (!isOpen || !src) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all" onClick={onClose}>
            <div className="relative w-full max-w-5xl h-full max-h-[90vh] p-4 flex items-center justify-center" onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-white/70 hover:text-white transition z-50 p-2 bg-black/20 rounded-full"
                >
                    <X size={24} />
                </button>
                <div className="relative w-full h-full">
                    <Image
                        src={src}
                        alt="Image"
                        fill
                        className="object-contain"
                    />
                </div>
            </div>
        </div>
    );
}

export default ImageModal;
