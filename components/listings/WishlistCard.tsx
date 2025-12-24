'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";
import { SafeUser } from "@/types";

interface WishlistCardProps {
    data: any;
    currentUser?: SafeUser | null;
    onDelete?: (id: string) => void;
    isEditing?: boolean;
}

const WishlistCard: React.FC<WishlistCardProps> = ({
    data,
    currentUser,
    onDelete,
    isEditing
}) => {
    const router = useRouter();
    const firstListing = data.listings[0];
    const imageUrl = firstListing?.images?.[0]?.url;

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDelete) {
            onDelete(data.id);
        }
    };

    return (
        <div
            onClick={() => router.push(`/favorites/${data.id}`)}
            className="col-span-1 cursor-pointer group"
        >
            <div className="flex flex-col gap-0.5 w-full">
                <div
                    className="
            aspect-square 
            w-full 
            relative 
            overflow-hidden 
            rounded-[14px]
          "
                >
                    <Image
                        fill
                        alt="Wishlist"
                        src={imageUrl || '/images/placeholder.svg'}
                        className="
              object-cover 
              h-full 
              w-full 
              group-hover:scale-110 
              transition
            "
                    />
                    {isEditing && (
                        <div
                            onClick={handleDelete}
                            className="
                            absolute
                            top-3
                            right-3
                            bg-white
                            p-2
                            rounded-full
                            cursor-pointer
                            hover:opacity-80
                            transition
                            active:scale-90
                            shadow-md
                            z-10
                        "
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-black">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                    )}
                    {!imageUrl && (
                        <div className="absolute inset-0 flex items-center justify-center bg-neutral-200 text-neutral-500">
                            No items
                        </div>
                    )}
                </div>
                <div className="font-medium text-base md:text-lg leading-tight mt-1">
                    {data.name}
                </div>
                <div className="font-normal text-sm text-neutral-500 leading-none">
                    {data._count.listings} annonces
                </div>
            </div>
        </div>
    );
}

export default WishlistCard;
