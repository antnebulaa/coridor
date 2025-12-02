import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { FullConversationType } from "@/types";
import { User } from "@prisma/client";

const useOtherUser = (conversation: FullConversationType | { users: User[] }) => {
    const session = useSession();

    const otherUser = useMemo(() => {
        const currentUserEmail = session?.data?.user?.email;
        const currentUserId = session?.data?.user?.id;

        const otherUser = conversation.users.filter((user) => {
            if (currentUserId) {
                return user.id !== currentUserId;
            }
            return user.email !== currentUserEmail;
        });

        return otherUser[0];
    }, [session?.data?.user?.email, session?.data?.user?.id, conversation.users]);

    return otherUser;
};

export default useOtherUser;
