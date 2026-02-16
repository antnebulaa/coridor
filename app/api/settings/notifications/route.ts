import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

export async function GET() {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get or create default preferences
        let preferences = await prisma.notificationPreferences.findUnique({
            where: { userId: currentUser.id }
        });

        if (!preferences) {
            // Create default preferences
            preferences = await prisma.notificationPreferences.create({
                data: {
                    userId: currentUser.id,
                    enableMessages: true,
                    enableVisits: true,
                    enableApplications: true,
                    enableLikes: false,
                }
            });
        }

        return NextResponse.json(preferences);
    } catch (error) {
        console.error("Get Notification Preferences Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            enableMessages,
            enableVisits,
            enableApplications,
            enableLikes,
            enableLegalReminders,
            legalReminderLeadDays,
            dndStartHour,
            dndEndHour
        } = body;

        // Update or create preferences
        const preferences = await prisma.notificationPreferences.upsert({
            where: { userId: currentUser.id },
            update: {
                enableMessages: enableMessages ?? true,
                enableVisits: enableVisits ?? true,
                enableApplications: enableApplications ?? true,
                enableLikes: enableLikes ?? false,
                enableLegalReminders: enableLegalReminders ?? true,
                legalReminderLeadDays: legalReminderLeadDays ?? 30,
                dndStartHour,
                dndEndHour
            },
            create: {
                userId: currentUser.id,
                enableMessages: enableMessages ?? true,
                enableVisits: enableVisits ?? true,
                enableApplications: enableApplications ?? true,
                enableLikes: enableLikes ?? false,
                enableLegalReminders: enableLegalReminders ?? true,
                legalReminderLeadDays: legalReminderLeadDays ?? 30,
                dndStartHour,
                dndEndHour
            }
        });

        return NextResponse.json(preferences);
    } catch (error) {
        console.error("Update Notification Preferences Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
