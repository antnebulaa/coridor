'use server'

import { revalidatePath } from "next/cache";
import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

export async function switchUserMode() {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        throw new Error("Unauthorized");
    }

    const newMode = currentUser.userMode === "LANDLORD" ? "TENANT" : "LANDLORD";

    await prisma.user.update({
        where: {
            id: currentUser.id
        },
        data: {
            userMode: newMode
        }
    });

    revalidatePath('/');
    return newMode;
}
