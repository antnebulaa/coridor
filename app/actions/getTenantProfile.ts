import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

export default async function getTenantProfile() {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return null;
        }

        const profile = await prisma.tenantProfile.findUnique({
            where: {
                userId: currentUser.id
            },
            include: {
                guarantors: {
                    include: {
                        additionalIncomes: true
                    }
                },
                additionalIncomes: true
            }
        });

        return profile;
    } catch (error: any) {
        return null;
    }
}
