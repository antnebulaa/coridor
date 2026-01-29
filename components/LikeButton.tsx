'use client';

import { SafeUser } from "@/types";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";
import { useRouter } from "next/navigation";
import { useCallback, useState, useRef } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

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
    const shouldAnimate = useRef(false);

    const toggleLike = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();

        if (!currentUser) {
            toast.error("Veuillez vous connecter pour aimer cette annonce.");
            return;
        }

        if (isLoading) return;

        shouldAnimate.current = true;
        setHasLiked(!hasLiked);
        setIsLoading(true);

        try {
            await axios.post(`/api/likes/${listingId}`);
            router.refresh();
        } catch (error) {
            setHasLiked(!hasLiked);
            toast.error("Une erreur est survenue");
        } finally {
            setIsLoading(false);
        }

    }, [currentUser, hasLiked, listingId, isLoading, router]);


    return (
        <div
            onClick={toggleLike}
            className="
                relative
                hover:opacity-80
                transition
                cursor-pointer
                w-8 h-8
                flex items-center justify-center
            "
        >
            <svg width="1" height="0" className="absolute pointer-events-none" aria-hidden="true">
                <defs>
                    <linearGradient id="ai-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop stopColor="#D82800" offset="0%" />
                        <stop stopColor="#D82800" offset="50%" />
                        <stop stopColor="#750077" offset="100%" />
                    </linearGradient>
                </defs>
            </svg>

            <AnimatePresence mode="wait">
                {hasLiked ? (
                    <motion.div
                        key="liked"
                        initial={shouldAnimate.current ? { scale: 0, y: 15 } : { scale: 1, y: 0 }}
                        animate={shouldAnimate.current ? {
                            scale: [0, 2.2, 2.4, 1.2, 1],
                            y: [15, -22, -42, -22, 0], // Jump Action
                            rotate: [0, 0, 0, 0]
                        } : { scale: 1, y: 0 }}
                        exit={{ scale: 0, transition: { duration: 0.1 } }}
                        transition={{
                            duration: 0.4,
                            ease: "easeOut",
                            times: [0, 0.3, 0.5, 0.7, 1]
                        }}
                    >
                        <AiFillHeart
                            size={28}
                            style={{ fill: "url(#ai-gradient)" }}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="unliked"
                        initial={shouldAnimate.current ? { scale: 0 } : { scale: 1 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <AiOutlineHeart
                            size={28}
                            className="fill-neutral-500"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default LikeButton;
