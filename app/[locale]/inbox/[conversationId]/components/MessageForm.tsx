'use client';

import {
    HiPaperAirplane,
    HiPaperClip,
    HiPhoto,
    HiDocumentText
} from "react-icons/hi2";
import MessageInput from "./MessageInput";
import {
    FieldValues,
    SubmitHandler,
    useForm
} from "react-hook-form";
import { useTranslations } from "next-intl";
import { useState, useRef } from "react";
import axios from "axios";
import useConversation from "@/hooks/useConversation";
import { useRouter } from "next/navigation";

import { SafeUser, SafeMessage } from "@/types";

interface FormProps {
    onOptimisticMessage: (message: SafeMessage) => void;
    currentUser: SafeUser | null;
}

const MessageForm: React.FC<FormProps> = ({
    onOptimisticMessage,
    currentUser
}) => {
    const t = useTranslations('inbox.form');
    const { conversationId } = useConversation();

    const router = useRouter();

    const [isLoading, setIsLoading] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        register,
        handleSubmit,
        setValue,
        formState: {
            errors,
        }
    } = useForm<FieldValues>({
        defaultValues: {
            message: ''
        }
    });

    const triggerFileInput = (accept: string) => {
        if (fileInputRef.current) {
            fileInputRef.current.accept = accept;
            fileInputRef.current.click();
            setIsMenuOpen(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "coridor_uploads");

        try {
            const response = await axios.post(
                `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
                formData
            );

            const result = response.data;
            handleFileDirectUpload({ info: result });
        } catch (error) {
            console.error("Upload error:", error);
            // Optionally add toast notification here
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Reset input
            }
        }
    };

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        setValue('message', '', { shouldValidate: true });

        // Optimistic update
        if (currentUser) {
            const tempMessage: SafeMessage = {
                id: `temp-${Date.now()}`,
                body: data.message,
                image: null,
                createdAt: new Date().toISOString(),
                seenIds: [],
                conversationId: conversationId,
                senderId: currentUser.id,
                sender: currentUser,
                seen: [],
                listing: null,
                listingId: null,
                fileUrl: null,
                fileName: null,
                fileType: null,
            };
            onOptimisticMessage(tempMessage);
        }

        axios.post('/api/messages', {
            ...data,
            conversationId: conversationId
        }).then(() => {
            router.refresh();
        });
    };

    const handleFileDirectUpload = (result: any) => {
        const fileUrl = result?.info?.secure_url;
        const fileName = result?.info?.original_filename;
        const fileType = result?.info?.format; // e.g 'pdf', 'jpg'

        if (!fileUrl) return;

        // Is it an image?
        const isImg = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileType);

        axios.post('/api/messages', {
            ...(isImg ? { image: fileUrl } : { fileUrl, fileName, fileType }),
            conversationId: conversationId
        }).then(() => {
            router.refresh();
        });
    }

    return (
        <div className="
       p-4 
       pb-[calc(env(safe-area-inset-bottom)+1rem)]
       lg:pb-4 // Reset for desktop
       bg-white 
       border-t 
       border-gray-200 
       flex 
       items-center 
       gap-2 
       lg:gap-4 
       w-full
    ">
            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
                multiple={false}
            />

            {/* Attachment Menu Dropdown */}
            <div className="relative">
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    type="button"
                    className="text-primary hover:text-primary-hover transition p-2 bg-neutral-100 rounded-full"
                >
                    <HiPaperClip size={20} />
                </button>

                {isMenuOpen && (
                    <div className="
                        absolute 
                        bottom-16 // Moved further up
                        left-0 
                        bg-white 
                        shadow-md 
                        border 
                        border-neutral-200 
                        rounded-xl 
                        overflow-hidden 
                        min-w-[200px] // Slightly wider
                        z-50
                        flex
                        flex-col
                    ">
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => triggerFileInput('image/*')}
                            className="
                                px-4 
                                py-4 // Increased touch target
                                hover:bg-neutral-100 
                                transition 
                                flex 
                                items-center 
                                gap-3 
                                text-sm 
                                font-medium 
                                text-neutral-700
                                disabled:opacity-50
                            "
                        >
                            <HiPhoto size={24} className="text-primary" /> {/* Increased icon size */}
                            {t('attachment.photoVideo')}
                        </button>
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => triggerFileInput('*/*')}
                            className="
                                px-4 
                                py-4 // Increased touch target
                                hover:bg-neutral-100 
                                transition 
                                flex 
                                items-center 
                                gap-3 
                                text-sm 
                                font-medium 
                                text-neutral-700
                                border-t
                                border-neutral-100
                                disabled:opacity-50
                            "
                        >
                            <HiDocumentText size={24} className="text-primary" /> {/* Increased icon size */}
                            {t('attachment.document')}
                        </button>
                    </div>
                )}
            </div>

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex items-center gap-2 lg:gap-4 w-full font-medium"
            >
                <MessageInput
                    id="message"
                    register={register}
                    errors={errors}
                    required
                    placeholder={t('placeholder')}
                />
                <button
                    type="submit"
                    className="
            rounded-full 
            p-2 
            bg-primary 
            cursor-pointer 
            hover:bg-primary-hover 
            transition
          "
                >
                    <HiPaperAirplane
                        size={18}
                        className="text-white"
                    />
                </button>
            </form>
        </div>
    );
}

// Helper to check if file is an image
const isImage = (url: string) => {
    return url.match(/\.(jpeg|jpg|gif|png|webp)$/) != null;
}

export default MessageForm;
