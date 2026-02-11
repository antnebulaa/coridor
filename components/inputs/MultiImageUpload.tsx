'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { TbPhotoPlus } from 'react-icons/tb';
import { Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import CustomToast from "@/components/ui/CustomToast";
import { Button } from "../ui/Button";
import { compressImage } from '@/lib/imageCompression';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    TouchSensor,
    MouseSensor
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    rectSortingStrategy,
    sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import SortableUploadCard from './SortableUploadCard';

interface MultiImageUploadProps {
    onChange: (value: string[]) => void;
    value: string[];
    layoutMode?: 'default' | 'cover';
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
    onChange,
    value,
    layoutMode = 'default'
}) => {
    const [uploading, setUploading] = useState(false);
    const [uploadCount, setUploadCount] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<string>('');

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        setUploading(true);
        setUploadCount(acceptedFiles.length);
        const newUrls: string[] = [];

        try {
            for (let i = 0; i < acceptedFiles.length; i++) {
                const file = acceptedFiles[i];

                // Compress image before upload
                setUploadStatus(`Compression ${i + 1}/${acceptedFiles.length}...`);
                const compressedFile = await compressImage(file);

                setUploadStatus(`Envoi ${i + 1}/${acceptedFiles.length}...`);
                const formData = new FormData();
                formData.append('file', compressedFile);
                formData.append('upload_preset', 'airbnb-clone');

                const response = await axios.post(
                    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
                    formData
                );

                newUrls.push(response.data.secure_url);
            }

            onChange([...value, ...newUrls]);
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Images ajoutées avec succès !"
                    type="success"
                />
            ));
        } catch (error) {
            console.error('Upload error:', error);
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Erreur lors du téléchargement"
                    type="error"
                />
            ));
        } finally {
            setUploading(false);
            setUploadCount(0);
            setUploadStatus('');
        }
    }, [onChange, value]);

    const onRemove = useCallback((urlToRemove: string) => {
        onChange(value.filter((url) => url !== urlToRemove));
    }, [onChange, value]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = value.indexOf(active.id as string);
            const newIndex = value.indexOf(over?.id as string);
            onChange(arrayMove(value, oldIndex, newIndex));
        }
    };

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        accept: {
            'image/jpeg': [],
            'image/png': [],
            'image/webp': []
        },
        disabled: uploading
    });

    return (
        <div className="flex flex-col gap-4">
            <input {...getInputProps()} />

            {/* Dropzone */}
            <div
                {...getRootProps()}
                className={`
                    relative
                    cursor-pointer
                    hover:opacity-70
                    transition
                    border-dashed 
                    border-2 
                    p-20 
                    border-neutral-300
                    flex
                    flex-col
                    justify-center
                    items-center
                    gap-4
                    text-neutral-600
                    rounded-xl
                    ${isDragActive ? 'border-black bg-neutral-50' : ''}
                    ${uploading ? 'opacity-50 cursor-not-allowed bg-neutral-50' : ''}
                    hidden md:flex
                `}
            >
                {uploading ? (
                    <div className="flex flex-col items-center gap-3">
                        <svg className="animate-spin h-12 w-12 text-neutral-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <div className="font-medium text-lg text-neutral-500 animate-pulse">
                            {uploadStatus || `Téléchargement de ${uploadCount} photo${uploadCount > 1 ? 's' : ''}...`}
                        </div>
                    </div>
                ) : (
                    <>
                        <TbPhotoPlus size={50} />
                        <div className="font-medium text-lg text-center">
                            Cliquez pour ajouter des photos ou glissez-déposez
                        </div>
                        <div className="text-sm text-neutral-500">
                            JPG, PNG, WEBP
                        </div>
                    </>
                )}
            </div>

            {/* Mobile Upload Button */}
            <div className="md:hidden w-full">
                <Button
                    onClick={open}
                    label={uploading ? "Téléchargement en cours..." : "Ajoutez des photos"}
                    variant="outline"
                    icon={uploading ? Loader2 : TbPhotoPlus}
                    disabled={uploading}
                />
            </div>

            {/* Image Grid with Dnd-Kit */}
            {(value.length > 0 || uploading) && (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={value} strategy={rectSortingStrategy}>
                        <div className={`
                            grid 
                            gap-4
                            ${layoutMode === 'cover' ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}
                        `}>
                            {value.map((url, index) => (
                                <SortableUploadCard
                                    key={url}
                                    url={url}
                                    onRemove={onRemove}
                                    isCover={layoutMode === 'cover' && index === 0}
                                />
                            ))}

                            {/* Loading Skeletons */}
                            {uploading && Array.from({ length: uploadCount }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`
                                        bg-neutral-200 
                                        animate-pulse 
                                        rounded-xl 
                                        aspect-square
                                        ${layoutMode === 'cover' && value.length === 0 && i === 0 ? 'col-span-2 aspect-video' : 'col-span-1'}
                                    `}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
}

export default MultiImageUpload;
