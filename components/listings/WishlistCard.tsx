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
    const images = data.listings.map((l: any) => l.imageSrc);

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
            <div className="flex flex-col gap-2 w-full">
                <div className="aspect-[4/3] w-full grid grid-cols-3 grid-rows-2 gap-1 overflow-hidden rounded-[20px] relative">
                    {/* Large Image (Left) */}
                    <div className="col-span-2 row-span-2 relative bg-neutral-100">
                        {images[0] ? (
                            <Image
                                fill
                                alt="Wishlist Cover"
                                src={images[0]}
                                className="object-cover w-full h-full"
                            />
                        ) : (
                            <div className="w-full h-full bg-neutral-100" />
                        )}
                        {isEditing && (
                            <div
                                onClick={handleDelete}
                                className="
                                absolute
                                top-2
                                left-2
                                bg-white
                                p-1.5
                                rounded-full
                                cursor-pointer
                                hover:opacity-80
                                transition
                                active:scale-90
                                shadow-md
                                z-20
                            "
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-black">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Top Right Image */}
                    <div className="col-span-1 row-span-1 relative bg-neutral-100">
                        {images[1] ? (
                            <Image
                                fill
                                alt="Wishlist Item"
                                src={images[1]}
                                className="object-cover w-full h-full"
                            />
                        ) : (
                            <div className="w-full h-full bg-neutral-100" />
                        )}
                    </div>

                    {/* Bottom Right Image */}
                    <div className="col-span-1 row-span-1 relative bg-neutral-100">
                        {images[2] ? (
                            <Image
                                fill
                                alt="Wishlist Item"
                                src={images[2]}
                                className="object-cover w-full h-full"
                            />
                        ) : (
                            <div className="w-full h-full bg-neutral-100" />
                        )}
                    </div>


                </div>

                <div className="flex flex-col">
                    <div className="font-semibold text-lg leading-tight">
                        {data.name}
                    </div>
                    <div className="font-normal text-sm text-neutral-500">
                        {data._count.listings} {data._count.listings > 1 ? 'annonces' : 'annonce'}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default WishlistCard;
