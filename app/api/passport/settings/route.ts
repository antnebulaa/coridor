import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { PassportService } from "@/services/PassportService";

/**
 * PUT /api/passport/settings
 * Update passport sharing preferences for the authenticated tenant.
 */
export async function PUT(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const {
      isEnabled,
      showPaymentBadge,
      showRentalHistory,
      showLandlordReviews,
      showFinancialSummary,
      showVerifiedMonths,
    } = body;

    const settings = await PassportService.updatePassportSettings(
      currentUser.id,
      {
        isEnabled,
        showPaymentBadge,
        showRentalHistory,
        showLandlordReviews,
        showFinancialSummary,
        showVerifiedMonths,
      }
    );

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error("[Passport Settings PUT] Error:", error);
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
