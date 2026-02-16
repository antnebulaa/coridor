import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { ReminderEngine } from "@/services/ReminderEngine";

interface IParams {
  reminderId?: string;
}

/**
 * PATCH /api/reminders/[reminderId]/complete
 *
 * Marque un rappel comme complete pour l'utilisateur connecte.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<IParams> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reminderId } = await params;

    if (!reminderId || typeof reminderId !== 'string') {
      return NextResponse.json({ error: "Invalid reminder ID" }, { status: 400 });
    }

    await ReminderEngine.completeReminder(reminderId, currentUser.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/reminders/complete] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
