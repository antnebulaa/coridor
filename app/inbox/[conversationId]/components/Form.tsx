'use client';

import {
    HiPaperAirplane,
    HiPhoto
} from "react-icons/hi2";
import MessageInput from "./MessageInput";
import {
    FieldValues,
    SubmitHandler,
    useForm
} from "react-hook-form";
import axios from "axios";
import { CldUploadButton } from "next-cloudinary";
import useConversation from "@/hooks/useConversation";
import { useRouter } from "next/navigation";

import { SafeUser, SafeMessage } from "@/types";

interface FormProps {
    onOptimisticMessage: (message: SafeMessage) => void;
    currentUser: SafeUser | null;
}

const Form: React.FC<FormProps> = ({
    onOptimisticMessage,
    currentUser
}) => {
    const { conversationId } = useConversation();

    const router = useRouter();

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
                // Add a status property if we want to show "sending"
                // For now, we rely on the fact that it's in the list but not yet confirmed by server refresh
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

    const handleUpload = (result: any) => {
        // Optimistic update for image
        if (currentUser) {
            const tempMessage: SafeMessage = {
                id: `temp-${Date.now()}`,
                body: null,
                image: result?.info?.secure_url,
                createdAt: new Date().toISOString(),
                seenIds: [],
                conversationId: conversationId,
                senderId: currentUser.id,
                sender: currentUser,
                seen: [],
                listing: null,
                listingId: null
            };
            onOptimisticMessage(tempMessage);
        }

        axios.post('/api/messages', {
            image: result?.info?.secure_url,
            conversationId: conversationId
        }).then(() => {
            router.refresh();
        });
    }

    return (
        <div className="
      py-2 
      px-4 
      bg-white 
      border-t 
      border-gray-200 
      flex 
      items-center 
      gap-2 
      lg:gap-4 
      w-full
    ">
            <CldUploadButton
                options={{ maxFiles: 1 }}
                onUpload={handleUpload}
                uploadPreset="coridor-preset"
            >
                <HiPhoto size={30} className="text-primary" />
            </CldUploadButton>
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex items-center gap-2 lg:gap-4 w-full"
            >
                <MessageInput
                    id="message"
                    register={register}
                    errors={errors}
                    required
                    placeholder="Write a message"
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

export default Form;
