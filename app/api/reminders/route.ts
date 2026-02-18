import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { LegalReminderStatus, LegalReminderType } from "@prisma/client";
import { hasFeature } from '@/lib/features';


/**
 * GET /api/reminders
 *
 * Liste des rappels legaux de l'utilisateur connecte.
 *
 * Query params :
 * - status : filtre par statut (PENDING, UPCOMING, NOTIFIED, OVERDUE, COMPLETED, DISMISSED)
 * - type : filtre par type de rappel
 * - propertyId : filtre par bien
 *
 * Retourne la liste triee par dueDate ASC (les plus urgents en premier).
 */
export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check feature access
    const canAccessReminders = await hasFeature(currentUser.id, 'LEGAL_REMINDERS');
    if (!canAccessReminders) {
      return NextResponse.json(
        { error: 'Les rappels légaux nécessitent un abonnement Essentiel ou Pro.' },
        { status: 403 }
      );
    }


    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const propertyId = searchParams.get("propertyId");

    const where: any = {
      userId: currentUser.id
    };

    if (status) {
      // Support for comma-separated statuses (e.g. "UPCOMING,NOTIFIED,OVERDUE")
      const statuses = status.split(",") as LegalReminderStatus[];
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    }

    if (type) {
      where.type = type as LegalReminderType;
    }

    if (propertyId) {
      where.propertyId = propertyId;
    }

    const reminders = await prisma.legalReminder.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            address: true,
            city: true,
            zipCode: true,
            category: true
          }
        },
        rentalApplication: {
          select: {
            id: true,
            listing: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    return NextResponse.json(reminders);
  } catch (error) {
    console.error("[GET /api/reminders] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
