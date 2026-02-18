import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { PassportService } from "@/services/PassportService";

/**
 * POST /api/passport/review
 * Submit a landlord review for a tenant's rental history.
 * Body: {
 *   rentalHistoryId: string,
 *   scores: [{ criterion: LandlordReviewCriterion, rating: ReviewRating }]
 * }
 */
export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const { rentalHistoryId, scores } = body;

    if (!rentalHistoryId || !scores || !Array.isArray(scores)) {
      return NextResponse.json(
        {
          error:
            "Les champs rentalHistoryId et scores (array) sont requis",
        },
        { status: 400 }
      );
    }

    // Validate score structure
    for (const score of scores) {
      if (!score.criterion || !score.rating) {
        return NextResponse.json(
          {
            error:
              "Chaque score doit contenir criterion et rating",
          },
          { status: 400 }
        );
      }
    }

    const review = await PassportService.submitLandlordReview(
      currentUser.id,
      rentalHistoryId,
      scores
    );

    return NextResponse.json(review, { status: 201 });
  } catch (error: any) {
    console.error("[Passport Review POST] Error:", error);

    // Map business logic errors to appropriate HTTP status codes
    const message = error.message || "Erreur serveur";
    let status = 500;
    if (message.includes("Non autorise")) status = 403;
    else if (message.includes("Seuls les baux")) status = 400;
    else if (message.includes("3 mois")) status = 400;
    else if (message.includes("existe deja")) status = 409;
    else if (message.includes("6 scores") || message.includes("criteres"))
      status = 400;

    return NextResponse.json({ error: message }, { status });
  }
}
