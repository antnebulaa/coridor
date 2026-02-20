import { redirect } from "next/navigation";
import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import RentalProjectClient from "./RentalProjectClient";
import prisma from "@/libs/prismadb";

const RentalProjectPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect('/');
    }

    const existingScope = await prisma.tenantCandidateScope.findFirst({
        where: {
            creatorUserId: currentUser.id
        }
    });

    const safeScope = existingScope ? {
        ...existingScope,
        createdAt: existingScope.createdAt.toISOString(),
        targetMoveInDate: existingScope.targetMoveInDate ? existingScope.targetMoveInDate.toISOString() : null
    } : null;

    return (
        <ClientOnly>
            <RentalProjectClient existingScope={safeScope} />
        </ClientOnly>
    );
}

export default RentalProjectPage;
