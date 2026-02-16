import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { PaymentVerificationService } from "@/services/PaymentVerificationService";

export async function POST() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const badgeInfo = await PaymentVerificationService.updateBadge(
      currentUser.id
    );

    return NextResponse.json(badgeInfo);
  } catch (error) {
    console.error("Badge Verification Error:", error);
    return NextResponse.json(
      { error: "Failed to verify badge" },
      { status: 500 }
    );
  }
}
