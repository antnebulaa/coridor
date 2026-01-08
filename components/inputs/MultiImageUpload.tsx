'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { TbPhotoPlus, TbX } from 'react-icons/tb';
import Image from 'next/image';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import CustomToast from "@/components/ui/CustomToast";

interface MultiImageUploadProps {
    onChange: (value: string[]) => void;
    value: string[];
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
    onChange,
    value
}) => {
    const [uploading, setUploading] = useState(false);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        setUploading(true);
        const newUrls: string[] = [];

        try {
            for (const file of acceptedFiles) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', 'airbnb-clone'); // Using the same preset as before

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
                    message="Images uploaded successfully!"
                    type="success"
                />
            ));
        } catch (error) {
            console.error('Upload error:', error);
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Error uploading images"
                    type="error"
                />
            ));
        } finally {
            setUploading(false);
        }
    }, [onChange, value]);

    const onRemove = useCallback((urlToRemove: string) => {
        onChange(value.filter((url) => url !== urlToRemove));
    }, [onChange, value]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
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
                    ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
                <input {...getInputProps()} />
                <TbPhotoPlus size={50} />
                <div className="font-medium text-lg text-center">
                    {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                </div>
                <div className="text-sm text-neutral-500">
                    JPG, PNG, WEBP
                </div>
            </div>

            {value.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[50vh] overflow-y-auto">
                    {value.map((url) => (
                        <div key={url} className="relative h-48 w-full rounded-xl overflow-hidden group">
                            <Image
                                fill
                                style={{ objectFit: 'cover' }}
                                src={url}
                                alt="Uploaded image"
                            />
                            <button
                                onClick={() => onRemove(url)}
                                className="
                                    absolute 
                                    top-2 
                                    right-2 
                                    bg-primary 
                                    text-white 
                                    p-1 
                                    rounded-full 
                                    opacity-0 
                                    group-hover:opacity-100 
                                    transition
                                    hover:scale-110
                                "
                                type="button"
                            >
                                <TbX size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default MultiImageUpload;
