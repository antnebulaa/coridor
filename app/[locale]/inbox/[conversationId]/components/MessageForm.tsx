'use client';

import {
    HiPaperAirplane,
    HiPaperClip,
    HiPhoto,
    HiDocumentText,
    HiXMark
} from "react-icons/hi2";
import { FileText, Image as ImageIcon, File as FileIcon } from "lucide-react";
import MessageInput from "./MessageInput";
import {
    FieldValues,
    SubmitHandler,
    useForm
} from "react-hook-form";
import { useTranslations } from "next-intl";
import { hapticLight } from "@/lib/haptics";
import { useState, useRef } from "react";
import axios from "axios";
import useConversation from "@/hooks/useConversation";
import { useRouter } from "next/navigation";

import { SafeUser, SafeMessage } from "@/types";

interface PendingFile {
    file: File;
    preview?: string; // Object URL for image preview
    label: string;
}

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
    const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isImg = file.type.startsWith("image/");
        const preview = isImg ? URL.createObjectURL(file) : undefined;

        setPendingFile({ file, preview, label: "" });

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const cancelPendingFile = () => {
        if (pendingFile?.preview) {
            URL.revokeObjectURL(pendingFile.preview);
        }
        setPendingFile(null);
    };

    const uploadAndSendFile = async () => {
        if (!pendingFile) return;
        setIsLoading(true);

        try {
            // Step 1: Upload file to our server (Supabase Storage)
            const uploadFormData = new FormData();
            uploadFormData.append("file", pendingFile.file);

            const uploadResponse = await axios.post(
                `/api/conversations/${conversationId}/upload`,
                uploadFormData
            );

            const { storagePath, fileName, fileType, fileSize, signedUrl } = uploadResponse.data;
            const isImg = fileType.startsWith("image/");

            // Step 2: Create message with signed URL for immediate display
            await axios.post("/api/messages", {
                ...(isImg ? { image: signedUrl } : { fileUrl: signedUrl }),
                storagePath,
                fileName: fileName || pendingFile.file.name,
                fileMimeType: fileType,
                fileSize,
                fileLabel: pendingFile.label.trim() || undefined,
                conversationId: conversationId,
            });

            router.refresh();
        } catch (error: any) {
            console.error("Upload error:", error?.response?.data || error);
        } finally {
            if (pendingFile?.preview) {
                URL.revokeObjectURL(pendingFile.preview);
            }
            setPendingFile(null);
            setIsLoading(false);
        }
    };

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        hapticLight();
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
                documents: [],
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

    const getFileDisplayIcon = () => {
        if (!pendingFile) return FileIcon;
        if (pendingFile.file.type.startsWith("image/")) return ImageIcon;
        if (pendingFile.file.type.includes("pdf")) return FileText;
        return FileIcon;
    };

    return (
        <div className="bg-white border-t border-gray-200 w-full">
            {/* Staged File Preview */}
            {pendingFile && (
                <div className="px-4 pt-3 pb-0">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                        {pendingFile.preview ? (
                            <img
                                src={pendingFile.preview}
                                alt="Preview"
                                className="w-12 h-12 rounded-lg object-cover shrink-0"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-gray-400">
                                {(() => { const Icon = getFileDisplayIcon(); return <Icon size={20} />; })()}
                            </div>
                        )}
                        <div className="flex flex-col flex-1 min-w-0 gap-1">
                            <span className="text-sm font-medium text-neutral-800 truncate">
                                {pendingFile.file.name}
                            </span>
                            <input
                                type="text"
                                value={pendingFile.label}
                                onChange={(e) => setPendingFile({ ...pendingFile, label: e.target.value })}
                                placeholder="Ajouter un libellé (optionnel)"
                                className="text-xs text-gray-500 bg-transparent border-none outline-none placeholder:text-gray-300 w-full"
                            />
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                onClick={cancelPendingFile}
                                type="button"
                                className="p-1.5 rounded-full hover:bg-gray-200 transition text-gray-400"
                            >
                                <HiXMark size={16} />
                            </button>
                            <button
                                onClick={uploadAndSendFile}
                                type="button"
                                disabled={isLoading}
                                className="p-2 rounded-full bg-primary text-white hover:bg-primary-hover transition disabled:opacity-50"
                            >
                                <HiPaperAirplane size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="
       p-4
       pb-[calc(env(safe-area-inset-bottom)+1rem)]
       lg:pb-4
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
        </div>
    );
}

export default MessageForm;
