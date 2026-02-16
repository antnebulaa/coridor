import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { ReminderEngine } from "@/services/ReminderEngine";

interface IParams {
  reminderId?: string;
}

/**
 * PATCH /api/reminders/[reminderId]/dismiss
 *
 * Ignore un rappel avec une raison optionnelle.
 * Body : { reason?: string }
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

    let reason: string | undefined;
    try {
      const body = await request.json();
      reason = body.reason;
    } catch {
      // Body is optional, ignore parse errors
    }

    await ReminderEngine.dismissReminder(reminderId, currentUser.id, reason);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/reminders/dismiss] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
