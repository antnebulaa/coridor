'use client';

import clsx from "clsx";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import Image from "next/image";
import { useState } from "react";

import { FullMessageType, SafeMessage } from "@/types";
import Avatar from "@/components/Avatar";
import { HiCheck, HiClock } from "react-icons/hi2";
import ImageModal from "./ImageModal";
import VisitSlotSelector from "@/components/visits/VisitSlotSelector";

interface MessageBoxProps {
    data: SafeMessage | FullMessageType;
    isLast?: boolean;
    onOpenVisitSlots?: () => void;
}

const MessageBox: React.FC<MessageBoxProps> = ({
    data,
    isLast,
    onOpenVisitSlots
}) => {
    const session = useSession();
    const [imageModalOpen, setImageModalOpen] = useState(false);

    const isOwn = session?.data?.user?.email === data.sender?.email;
    const seenList = (data.seen || [])
        .filter((user) => user.email !== data.sender?.email)
        .map((user) => user.name)
        .join(', ');

    const container = clsx(
        "flex gap-3 p-4",
        isOwn && "justify-end"
    );

    const avatar = clsx(isOwn && "order-2");

    const body = clsx(
        "flex flex-col gap-2",
        isOwn && "items-end"
    );

    const message = clsx(
        "text-sm w-fit",
        data.body === 'INVITATION_VISITE' ? "p-0" :
            (data.image || data.listing) ? "rounded-md p-0 overflow-hidden" :
                clsx(
                    "overflow-hidden py-2 px-3",
                    isOwn ? "bg-primary text-white rounded-2xl rounded-br-none" : "bg-gray-100 rounded-2xl rounded-bl-none"
                )
    );



    const isTemp = data.id.startsWith('temp-');

    return (
        <div className={container}>
            {!isOwn && (
                <div className={avatar}>
                    <Avatar src={data.sender?.image} seed={data.sender?.email || data.sender?.name} />
                </div>
            )}
            <div className={body}>
                <div className="flex items-center gap-1">
                    {!isOwn && (
                        <div className="text-sm text-gray-500">
                            {data.sender?.name}
                        </div>
                    )}
                    <div className="text-xs text-gray-500">
                        {format(new Date(data.createdAt), 'p')}
                    </div>
                    {isOwn && (
                        <div className="text-xs text-gray-400">
                            {isTemp ? <HiClock size={14} /> : <HiCheck size={14} />}
                        </div>
                    )}
                </div>
                <div className={message}>
                    <ImageModal src={data.image} isOpen={imageModalOpen} onClose={() => setImageModalOpen(false)} />
                    {data.image ? (
                        <Image
                            onClick={() => setImageModalOpen(true)}
                            alt="Image"
                            height="288"
                            width="288"
                            src={data.image}
                            className="
                                object-cover 
                                cursor-pointer 
                                hover:scale-110 
                                transition 
                                translate
                            "
                        />
                    ) : data.body === 'INVITATION_VISITE' ? (
                        <div className={clsx(
                            "flex flex-col gap-2 bg-white border border-gray-200 p-4 rounded-2xl",
                            isOwn ? "rounded-br-none" : "rounded-bl-none"
                        )}>
                            <div className="font-semibold text-gray-900">
                                {data.sender?.name || 'Le propriétaire'} est intéressé par votre profil et vous propose une visite.
                            </div>
                            <div className="text-gray-500 mb-2">
                                Veuillez choisir un horaire parmi les créneaux disponibles.
                            </div>
                            <button
                                disabled={!data.listingId || !onOpenVisitSlots}
                                onClick={onOpenVisitSlots}
                                className="
                                    px-4 py-2 bg-black text-white rounded-lg text-sm font-bold
                                    hover:bg-neutral-800 transition w-fit
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                "
                            >
                                Choisir un horaire
                            </button>
                        </div>
                    ) : data.listing && (data.listing as any).images ? (
                        <div className="flex flex-col">
                            {data.body && (
                                <div className="mb-2">{data.body}</div>
                            )}
                            <div className="flex flex-col gap-2 w-64 max-w-full bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-200">
                                <div className="relative w-full h-32">
                                    <Image
                                        fill
                                        src={(data.listing as any).images[0]?.url || '/images/placeholder.jpg'}
                                        alt="Listing"
                                        className="object-cover"
                                    />
                                </div>
                                <div className="p-3">
                                    <div className="font-semibold text-gray-900 truncate">
                                        {data.listing.title}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {data.listing.price}€ / month
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>{data.body}</div>
                    )}
                </div>
                {isLast && isOwn && seenList.length > 0 && (
                    <div className="
            text-xs 
            font-light 
            text-gray-500
          ">
                        {`Seen by ${seenList}`}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MessageBox;
