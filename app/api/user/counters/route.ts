import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getUnreadMessageCount from "@/app/actions/getUnreadMessageCount";
import getDashboardAlerts from "@/app/actions/getDashboardAlerts";
import prisma from "@/libs/prismadb";

export async function GET(
    request: Request
) {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return NextResponse.json({
                unreadCount: 0,
                hasPendingAlert: false
            });
        }

        // Run parallel fetches for efficiency
        const [unreadCount, dashboardAlerts, notificationCount] = await Promise.all([
            getUnreadMessageCount(),
            getDashboardAlerts(),
            prisma.notification.count({
                where: {
                    userId: currentUser.id,
                    isRead: false
                }
            })
        ]);

        console.log(`[API Counters] Returning unreadCount: ${unreadCount}, notifCount: ${notificationCount}`);

        return NextResponse.json({
            unreadCount,
            hasPendingAlert: dashboardAlerts.hasPendingConfig,
            notificationCount
        });

    } catch (error: any) {
        console.error('COUNTERS_ERROR', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
