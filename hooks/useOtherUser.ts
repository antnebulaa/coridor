import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { FullConversationType } from "@/types";
import { User } from "@prisma/client";

const useOtherUser = (conversation: FullConversationType | { users: User[] }) => {
    const session = useSession();

    const otherUser = useMemo(() => {
        const currentUserId = session?.data?.user?.id;

        // If we have no current user ID, we can't safely determine the other user.
        if (!currentUserId) {
            return null;
        }

        const otherUser = conversation.users.filter((user) => user.id !== currentUserId);

        return otherUser[0];
    }, [session?.data?.user?.id, conversation.users]);

    return otherUser;
};

export default useOtherUser;
