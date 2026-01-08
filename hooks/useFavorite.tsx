import axios from "axios";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import CustomToast from "@/components/ui/CustomToast";

import { SafeUser } from "@/types";
import useLoginModal from "./useLoginModal";

interface IUseFavorite {
    listingId: string;
    currentUser?: SafeUser | null;
}

const useFavorite = ({ listingId, currentUser }: IUseFavorite) => {
    const router = useRouter();
    const loginModal = useLoginModal();

    const hasFavorited = useMemo(() => {
        const list = currentUser?.favoriteIds || [];

        return list.includes(listingId);
    }, [currentUser, listingId]);

    const toggleFavorite = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();

        if (!currentUser) {
            return loginModal.onOpen();
        }

        try {
            let request;

            if (hasFavorited) {
                request = () => axios.delete(`/api/favorites/${listingId}`);
            } else {
                request = () => axios.post(`/api/favorites/${listingId}`);
            }

            await request();
            router.refresh();
            toast.custom((t) => (
                <CustomToast
                    t= { t }
                    message = "Success"
                    type = "success"
                />
            ));
} catch (error) {
    toast.custom((t) => (
        <CustomToast
                    t= { t }
                    message = "Something went wrong."
                    type = "error"
        />
            ));
}
    }, [
    currentUser,
    hasFavorited,
    listingId,
    loginModal,
    router
]);

return {
    hasFavorited,
    toggleFavorite,
}
}

export default useFavorite;
