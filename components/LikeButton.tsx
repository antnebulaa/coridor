'use client';

import { SafeUser } from "@/types";
import { Meh, Smile } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion"; // Added framer-motion

interface LikeButtonProps {
    listingId: string;
    currentUser?: SafeUser | null;
    likes?: string[];
    hasLiked?: boolean;
}

const LikeButton: React.FC<LikeButtonProps> = ({
    listingId,
    currentUser,
    hasLiked: initialHasLiked
}) => {
    const router = useRouter();
    const [hasLiked, setHasLiked] = useState(initialHasLiked);
    const [isLoading, setIsLoading] = useState(false);

    const toggleLike = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();

        if (!currentUser) {
            toast.error("Veuillez vous connecter pour aimer cette annonce.");
            return;
        }

        if (isLoading) return;

        setHasLiked(!hasLiked); // Optimistic UI
        setIsLoading(true);

        try {
            await axios.post(`/api/likes/${listingId}`);
            router.refresh();
        } catch (error) {
            setHasLiked(!hasLiked); // Revert if failed
            toast.error("Une erreur est survenue");
        } finally {
            setIsLoading(false);
        }

    }, [currentUser, hasLiked, listingId, isLoading, router]);


    return (
        <div
            onClick={toggleLike}
            className={`
                relative
                hover:opacity-80
                transition
                cursor-pointer
            `}
        >
            <motion.div
                key={hasLiked ? "liked" : "unliked"}
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className={`
                    w-8 h-8
                    rounded-full 
                    flex items-center justify-center
                    border border-neutral-200 dark:border-neutral-800
                    bg-white dark:bg-neutral-900
                    transition-colors
                    ${hasLiked
                        ? 'text-black'
                        : 'text-neutral-500 hover:bg-neutral-50 hover:text-black'}
                `}
            >
                {hasLiked ? (
                    <Smile
                        size={18}
                        className="fill-amber-400 text-black"
                    />
                ) : (
                    <Meh
                        size={18}
                        className="fill-transparent"
                    />
                )}
            </motion.div>
        </div>
    );
}

export default LikeButton;
