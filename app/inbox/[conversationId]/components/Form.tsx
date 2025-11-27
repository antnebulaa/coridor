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

const Form = () => {
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
        axios.post('/api/messages', {
            ...data,
            conversationId: conversationId
        }).then(() => {
            router.refresh();
        });
    };

    const handleUpload = (result: any) => {
        axios.post('/api/messages', {
            image: result?.info?.secure_url,
            conversationId: conversationId
        }).then(() => {
            router.refresh();
        });
    }

    return (
        <div className="
      py-4 
      px-4 
      bg-white 
      border-t 
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
                <HiPhoto size={30} className="text-rose-500" />
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
            bg-rose-500 
            cursor-pointer 
            hover:bg-rose-600 
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
