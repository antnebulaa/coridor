import prisma from "@/libs/prismadb";
import { createNotification } from "@/libs/notifications";
import type {
  LandlordReviewCriterion,
  ReviewRating,
  RentalPropertyType,
} from "@prisma/client";

// ── Types ──────────────────────────────────────────────────────────

interface PassportScoreInput {
  regularityRate: number | null; // % of months where payment was detected (replaces badgeLevel)
  punctualityRate: number | null;
  verifiedMonths: number;
  totalRentalMonths: number;
  verifiedRentalMonths: number;
  landlordReviews: {
    compositeScore: number;
    isVerified: boolean;
  }[];
  profileCompleteness: number;
}

interface PassportScoreResult {
  globalScore: number;
  badgeScore: number;
  tenureScore: number;
  reviewScore: number;
  completenessScore: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
}

interface ManualRentalHistoryInput {
  city: string;
  zipCode?: string;
  propertyType: RentalPropertyType;
  rentAmountCents?: number;
  startDate: Date;
  endDate?: Date;
  landlordName?: string;
}

interface PassportSettingsInput {
  isEnabled?: boolean;
  showPaymentBadge?: boolean;
  showRentalHistory?: boolean;
  showLandlordReviews?: boolean;
  showFinancialSummary?: boolean;
  showVerifiedMonths?: boolean;
}

interface ReviewScoreInput {
  criterion: LandlordReviewCriterion;
  rating: ReviewRating;
}

// ── Score computation (section 6 of SCHEMA doc) ────────────────────

function computePassportScore(input: PassportScoreInput): PassportScoreResult {
  // 1. Badge Payeur verifie (40%)
  // Badge component is active if verifiedMonths >= 3
  // badgeScore = (verifiedMonths / 24) * 0.6 + regularityRate * 0.4, capped at 100
  const regularity = input.regularityRate ?? 0;
  const badgeActive = input.verifiedMonths >= 3;

  const badgeScore = badgeActive
    ? Math.min(
        100,
        (input.verifiedMonths / 24) * 100 * 0.6 + regularity * 0.4
      )
    : 0;

  // 2. Anciennete locative (20%)
  const cappedMonths = Math.min(input.totalRentalMonths, 60);
  const tenureBase = (cappedMonths / 60) * 100;

  const verificationRatio =
    input.totalRentalMonths > 0
      ? input.verifiedRentalMonths / input.totalRentalMonths
      : 0;
  const tenureScore = tenureBase * (0.7 + 0.3 * verificationRatio);

  // 3. Evaluations proprietaires (25%)
  let reviewScore = 0;
  if (input.landlordReviews.length > 0) {
    let weightedSum = 0;
    let totalWeight = 0;
    for (const review of input.landlordReviews) {
      const weight = review.isVerified ? 2 : 1;
      // Convert 1.00-3.00 to 0-100
      const normalizedScore = ((review.compositeScore - 1) / 2) * 100;
      weightedSum += normalizedScore * weight;
      totalWeight += weight;
    }
    reviewScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  // 4. Completude du dossier (15%)
  const completenessScore = input.profileCompleteness;

  // Global score
  const globalScore = Math.round(
    badgeScore * 0.4 +
      tenureScore * 0.2 +
      reviewScore * 0.25 +
      completenessScore * 0.15
  );

  // Confidence index
  let confidence: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  const hasVerifiedPayments = input.verifiedMonths >= 3;
  const hasVerifiedHistory = input.verifiedRentalMonths >= 6;
  const hasVerifiedReview = input.landlordReviews.some((r) => r.isVerified);
  const verifiedCount = [
    hasVerifiedPayments,
    hasVerifiedHistory,
    hasVerifiedReview,
  ].filter(Boolean).length;

  if (verifiedCount >= 3) confidence = "HIGH";
  else if (verifiedCount >= 1) confidence = "MEDIUM";

  return {
    globalScore: Math.min(100, Math.max(0, globalScore)),
    badgeScore: Math.round(badgeScore),
    tenureScore: Math.round(tenureScore),
    reviewScore: Math.round(reviewScore),
    completenessScore: Math.round(completenessScore),
    confidence,
  };
}

// ── PassportService ────────────────────────────────────────────────

export class PassportService {
  // ── a) getPassport — Full passport retrieval (section 10.1) ──────

  static async getPassport(userId: string) {
    const passport = await prisma.tenantProfile.findUnique({
      where: { userId },
      include: {
        // Preferences de partage
        passportSettings: true,

        // Historique locatif (non masque)
        rentalHistory: {
          where: { isHidden: false },
          orderBy: { startDate: "desc" },
          include: {
            landlordReview: {
              include: { scores: true },
            },
          },
        },

        // Garants et revenus (pour completude)
        guarantors: { include: { additionalIncomes: true } },
        additionalIncomes: true,
      },
    });

    return passport;
  }

  // ── b) getVisiblePassport — Filtered by settings + consent (section 10.2) ──

  static async getVisiblePassport(userId: string, viewerId: string) {
    const passport = await this.getPassport(userId);
    if (!passport) return null;

    const settings = passport.passportSettings;
    if (!settings?.isEnabled) return null;

    // Verify the viewer is a landlord with a legitimate reason (has a property)
    const viewerHasProperty = await prisma.property.findFirst({
      where: { ownerId: viewerId },
      select: { id: true },
    });

    if (!viewerHasProperty) return null;

    return {
      // Payeur verifie — X mois (no more Bronze/Silver/Gold levels)
      paymentBadge: settings.showPaymentBadge
        ? {
            verifiedMonths: settings.showVerifiedMonths
              ? passport.verifiedMonths
              : undefined,
            punctualityRate: passport.punctualityRate,
          }
        : undefined,

      // Historique des baux
      rentalHistory: settings.showRentalHistory
        ? passport.rentalHistory.map((rh) => ({
            id: rh.id,
            source: rh.source,
            city: rh.city,
            zipCode: rh.zipCode,
            propertyType: rh.propertyType,
            rentAmountCents: rh.rentAmountCents,
            startDate: rh.startDate,
            endDate: rh.endDate,
            isVerified: rh.isVerified,
          }))
        : undefined,

      // Evaluations proprietaires (only if consented)
      landlordReviews: settings.showLandlordReviews
        ? passport.rentalHistory
            .filter((rh) => rh.landlordReview?.tenantConsented)
            .map((rh) => rh.landlordReview)
        : undefined,

      // Synthese financiere
      financialSummary: settings.showFinancialSummary
        ? {
            netSalary: passport.netSalary,
            partnerNetSalary: passport.partnerNetSalary,
            aplAmount: passport.aplAmount,
          }
        : undefined,

      // Score is PRIVATE (tenant only) — never exposed to landlord/viewer
    };
  }

  // ── c) computeScore — Composite score 0-100 (section 6) ─────────

  static async computeScore(
    userId: string
  ): Promise<PassportScoreResult | null> {
    const profile = await prisma.tenantProfile.findUnique({
      where: { userId },
      include: {
        rentalHistory: {
          where: { isHidden: false },
          include: {
            landlordReview: {
              where: { tenantConsented: true },
            },
          },
        },
        guarantors: true,
        additionalIncomes: true,
      },
    });

    if (!profile) return null;

    // Calculate rental months
    let totalMonths = 0;
    let verifiedMonths = 0;
    for (const rh of profile.rentalHistory) {
      const start = new Date(rh.startDate);
      const end = rh.endDate ? new Date(rh.endDate) : new Date();
      const months =
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth());
      totalMonths += Math.max(0, months);
      if (rh.isVerified) verifiedMonths += Math.max(0, months);
    }

    // Collect reviews
    const reviews = profile.rentalHistory
      .filter((rh) => rh.landlordReview)
      .map((rh) => ({
        compositeScore: rh.landlordReview!.compositeScore,
        isVerified: rh.isVerified,
      }));

    // Profile completeness
    const fields = [
      profile.jobType,
      profile.jobTitle,
      profile.netSalary,
      profile.bio,
      profile.guarantors.length > 0,
      profile.rentalHistory.length > 0,
      profile.verifiedMonths >= 3, // replaced badgeLevel check
    ];
    const filled = fields.filter(
      (f) => f !== null && f !== undefined && f !== "" && f !== false
    ).length;
    const profileCompleteness = Math.round((filled / fields.length) * 100);

    // Calculate regularity rate: verifiedMonths / totalRentalMonths
    // This represents the % of months where a payment was detected
    const regularityRate =
      totalMonths > 0
        ? Math.min(100, (profile.verifiedMonths / totalMonths) * 100)
        : profile.punctualityRate; // fallback to punctualityRate if no rental history

    return computePassportScore({
      regularityRate: regularityRate ?? null,
      punctualityRate: profile.punctualityRate,
      verifiedMonths: profile.verifiedMonths,
      totalRentalMonths: totalMonths,
      verifiedRentalMonths: verifiedMonths,
      landlordReviews: reviews,
      profileCompleteness,
    });
  }

  // ── d) submitLandlordReview — Create evaluation (section 10.3) ───

  static async submitLandlordReview(
    reviewerId: string,
    rentalHistoryId: string,
    scores: ReviewScoreInput[]
  ) {
    // 1. Verify that the reviewer is the property owner
    const rentalHistory = await prisma.rentalHistory.findUnique({
      where: { id: rentalHistoryId },
      include: {
        rentalApplication: {
          include: {
            listing: {
              include: {
                rentalUnit: { include: { property: true } },
              },
            },
          },
        },
        tenantProfile: { select: { userId: true } },
        landlordReview: { select: { id: true } },
      },
    });

    if (!rentalHistory?.rentalApplication) {
      throw new Error("Seuls les baux Coridor peuvent etre evalues");
    }

    const ownerId =
      rentalHistory.rentalApplication.listing.rentalUnit.property.ownerId;
    if (ownerId !== reviewerId) {
      throw new Error("Non autorise");
    }

    // 2. Verify the lease lasted at least 3 months
    const startDate = new Date(rentalHistory.startDate);
    const endDate = rentalHistory.endDate
      ? new Date(rentalHistory.endDate)
      : new Date();
    const monthsDiff =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth());
    if (monthsDiff < 3) {
      throw new Error("Le bail doit avoir dure au moins 3 mois");
    }

    // 3. Verify no existing review
    if (rentalHistory.landlordReview) {
      throw new Error("Une evaluation existe deja pour ce bail");
    }

    // 4. Verify exactly 4 scores (one per criterion) — V1: 4 criteria only
    if (scores.length !== 4) {
      throw new Error("Exactement 4 scores sont requis (un par critere)");
    }

    const requiredCriteria: LandlordReviewCriterion[] = [
      "PAYMENT_REGULARITY",
      "PROPERTY_CONDITION",
      "COMMUNICATION",
      "WOULD_RECOMMEND",
    ];
    const providedCriteria = scores.map((s) => s.criterion);
    const allCriteriaPresent = requiredCriteria.every((c) =>
      providedCriteria.includes(c)
    );
    if (!allCriteriaPresent) {
      throw new Error("Tous les criteres doivent etre renseignes");
    }

    // 5. Calculate composite score (sum of 4 ratings / 12, normalized to 1.00-3.00)
    const ratingToScore: Record<ReviewRating, number> = {
      POSITIVE: 3,
      NEUTRAL: 2,
      NEGATIVE: 1,
    };
    const totalScore = scores.reduce(
      (sum, s) => sum + ratingToScore[s.rating],
      0
    );
    // totalScore ranges from 4 (all NEGATIVE) to 12 (all POSITIVE)
    // Normalize to 1.00-3.00: (totalScore / 4) gives average per criterion
    const compositeScore = totalScore / 4;

    // 6. Create the review with scores
    const review = await prisma.landlordReview.create({
      data: {
        rentalHistoryId,
        reviewerId,
        compositeScore,
        scores: {
          create: scores.map((s) => ({
            criterion: s.criterion,
            rating: s.rating,
          })),
        },
      },
      include: { scores: true },
    });

    // 7. Send in-app notification to tenant
    const tenantUserId = rentalHistory.tenantProfile.userId;
    const city = rentalHistory.city;
    await createNotification({
      userId: tenantUserId,
      type: "PASSPORT_REVIEW",
      title: "Nouvelle évaluation reçue",
      message: `Vous avez reçu une nouvelle évaluation de votre ancien propriétaire pour votre location à ${city}. Consultez votre Passeport Locatif pour la découvrir.`,
      link: "/account/passport",
    });

    return review;
  }

  // ── e) updatePassportSettings — Update sharing preferences ───────

  static async updatePassportSettings(
    userId: string,
    settings: PassportSettingsInput
  ) {
    const profile = await prisma.tenantProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new Error("Profil locataire introuvable");
    }

    const now = new Date();

    // Determine if this is an activation
    const isActivating = settings.isEnabled === true;

    const updated = await prisma.passportSettings.upsert({
      where: { tenantProfileId: profile.id },
      create: {
        tenantProfileId: profile.id,
        isEnabled: settings.isEnabled ?? false,
        showPaymentBadge: settings.showPaymentBadge ?? true,
        showRentalHistory: settings.showRentalHistory ?? true,
        showLandlordReviews: settings.showLandlordReviews ?? false,
        showFinancialSummary: settings.showFinancialSummary ?? false,
        showVerifiedMonths: settings.showVerifiedMonths ?? true,
        activatedAt: isActivating ? now : null,
        lastModifiedAt: now,
      },
      update: {
        ...(settings.isEnabled !== undefined && {
          isEnabled: settings.isEnabled,
        }),
        ...(settings.showPaymentBadge !== undefined && {
          showPaymentBadge: settings.showPaymentBadge,
        }),
        ...(settings.showRentalHistory !== undefined && {
          showRentalHistory: settings.showRentalHistory,
        }),
        ...(settings.showLandlordReviews !== undefined && {
          showLandlordReviews: settings.showLandlordReviews,
        }),
        ...(settings.showFinancialSummary !== undefined && {
          showFinancialSummary: settings.showFinancialSummary,
        }),
        ...(settings.showVerifiedMonths !== undefined && {
          showVerifiedMonths: settings.showVerifiedMonths,
        }),
        ...(isActivating && { activatedAt: now }),
        lastModifiedAt: now,
      },
    });

    return updated;
  }

  // ── f) addManualRentalHistory — Add off-Coridor rental ───────────

  static async addManualRentalHistory(
    userId: string,
    data: ManualRentalHistoryInput
  ) {
    const profile = await prisma.tenantProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new Error("Profil locataire introuvable");
    }

    const rentalHistory = await prisma.rentalHistory.create({
      data: {
        tenantProfileId: profile.id,
        source: "MANUAL",
        city: data.city,
        zipCode: data.zipCode,
        propertyType: data.propertyType,
        rentAmountCents: data.rentAmountCents,
        startDate: data.startDate,
        endDate: data.endDate,
        landlordName: data.landlordName,
        isVerified: false,
        isHidden: false,
      },
    });

    return rentalHistory;
  }

  // ── g) toggleHistoryVisibility — Show/hide entry ─────────────────

  static async toggleHistoryVisibility(
    userId: string,
    rentalHistoryId: string,
    isHidden: boolean
  ) {
    const profile = await prisma.tenantProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new Error("Profil locataire introuvable");
    }

    // Verify ownership
    const entry = await prisma.rentalHistory.findFirst({
      where: {
        id: rentalHistoryId,
        tenantProfileId: profile.id,
      },
    });

    if (!entry) {
      throw new Error("Entree introuvable ou non autorisee");
    }

    return prisma.rentalHistory.update({
      where: { id: rentalHistoryId },
      data: { isHidden },
    });
  }

  // ── h) exportPassport — RGPD export (JSON or PDF) ───────────────

  static async exportPassport(
    userId: string,
    format: "json" | "pdf"
  ): Promise<{ data: unknown; contentType: string; fileName: string }> {
    const passport = await this.getPassport(userId);
    if (!passport) {
      throw new Error("Passeport introuvable");
    }

    const score = await this.computeScore(userId);

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: {
        jobType: passport.jobType,
        jobTitle: passport.jobTitle,
        netSalary: passport.netSalary,
        partnerJobType: passport.partnerJobType,
        partnerJobTitle: passport.partnerJobTitle,
        partnerNetSalary: passport.partnerNetSalary,
        aplAmount: passport.aplAmount,
        bio: passport.bio,
      },
      paymentBadge: {
        verifiedMonths: passport.verifiedMonths,
        punctualityRate: passport.punctualityRate,
        lastVerifiedAt: passport.lastVerifiedAt,
      },
      rentalHistory: passport.rentalHistory.map((rh) => ({
        source: rh.source,
        city: rh.city,
        zipCode: rh.zipCode,
        propertyType: rh.propertyType,
        rentAmountCents: rh.rentAmountCents,
        startDate: rh.startDate,
        endDate: rh.endDate,
        isVerified: rh.isVerified,
        landlordReview: rh.landlordReview
          ? {
              compositeScore: rh.landlordReview.compositeScore,
              tenantConsented: rh.landlordReview.tenantConsented,
              submittedAt: rh.landlordReview.submittedAt,
              scores: rh.landlordReview.scores.map((s) => ({
                criterion: s.criterion,
                rating: s.rating,
              })),
            }
          : null,
      })),
      score,
      settings: passport.passportSettings
        ? {
            isEnabled: passport.passportSettings.isEnabled,
            showPaymentBadge: passport.passportSettings.showPaymentBadge,
            showRentalHistory: passport.passportSettings.showRentalHistory,
            showLandlordReviews:
              passport.passportSettings.showLandlordReviews,
            showFinancialSummary:
              passport.passportSettings.showFinancialSummary,
            showVerifiedMonths:
              passport.passportSettings.showVerifiedMonths,
            activatedAt: passport.passportSettings.activatedAt,
          }
        : null,
    };

    if (format === "json") {
      return {
        data: exportData,
        contentType: "application/json",
        fileName: `passeport-locatif-${new Date().toISOString().split("T")[0]}.json`,
      };
    }

    // PDF export: generate a structured PDF using react-pdf
    // We dynamically import to avoid loading react-pdf for JSON exports
    const React = (await import("react")).default;
    const ReactPDF = (await import("@react-pdf/renderer")).default;
    const { Page, Text, View, Document, StyleSheet } = await import(
      "@react-pdf/renderer"
    );

    const styles = StyleSheet.create({
      page: {
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        padding: 40,
        fontFamily: "Helvetica",
        fontSize: 10,
        color: "#333333",
        lineHeight: 1.5,
      },
      header: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#EEEEEE",
        paddingBottom: 10,
      },
      brand: {
        fontSize: 20,
        fontFamily: "Helvetica-Bold",
        textTransform: "uppercase" as const,
        letterSpacing: 2,
      },
      subtitle: {
        fontSize: 14,
        marginTop: 4,
        color: "#666666",
      },
      section: {
        marginBottom: 15,
      },
      sectionTitle: {
        fontSize: 13,
        fontFamily: "Helvetica-Bold",
        marginBottom: 6,
        color: "#222222",
        borderBottomWidth: 1,
        borderBottomColor: "#EEEEEE",
        paddingBottom: 3,
      },
      row: {
        flexDirection: "row",
        marginBottom: 3,
      },
      label: {
        fontFamily: "Helvetica-Bold",
        width: 200,
      },
      value: {
        flex: 1,
      },
      historyItem: {
        marginBottom: 8,
        paddingLeft: 10,
        borderLeftWidth: 2,
        borderLeftColor: "#CCCCCC",
      },
      footer: {
        position: "absolute",
        bottom: 30,
        left: 40,
        right: 40,
        fontSize: 8,
        color: "#999999",
        textAlign: "center",
      },
    });

    const formatDate = (d: Date | null | undefined) => {
      if (!d) return "En cours";
      return new Date(d).toLocaleDateString("fr-FR");
    };

    const formatCents = (cents: number | null | undefined) => {
      if (cents === null || cents === undefined) return "Non renseigne";
      return `${(cents / 100).toFixed(2)} EUR`;
    };

    const doc = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: "A4", style: styles.page },
        // Header
        React.createElement(
          View,
          { style: styles.header },
          React.createElement(Text, { style: styles.brand }, "CORIDOR"),
          React.createElement(
            Text,
            { style: styles.subtitle },
            "Passeport Locatif"
          ),
          React.createElement(
            Text,
            { style: { fontSize: 9, color: "#999999", marginTop: 4 } },
            `Exporte le ${new Date().toLocaleDateString("fr-FR")}`
          )
        ),

        // Score
        score
          ? React.createElement(
              View,
              { style: styles.section },
              React.createElement(
                Text,
                { style: styles.sectionTitle },
                "Score Passeport"
              ),
              React.createElement(
                View,
                { style: styles.row },
                React.createElement(
                  Text,
                  { style: styles.label },
                  "Score global :"
                ),
                React.createElement(
                  Text,
                  { style: styles.value },
                  `${score.globalScore}/100 (Confiance: ${score.confidence})`
                )
              ),
              React.createElement(
                View,
                { style: styles.row },
                React.createElement(
                  Text,
                  { style: styles.label },
                  "Badge Payeur :"
                ),
                React.createElement(
                  Text,
                  { style: styles.value },
                  `${score.badgeScore}/100`
                )
              ),
              React.createElement(
                View,
                { style: styles.row },
                React.createElement(
                  Text,
                  { style: styles.label },
                  "Anciennete :"
                ),
                React.createElement(
                  Text,
                  { style: styles.value },
                  `${score.tenureScore}/100`
                )
              ),
              React.createElement(
                View,
                { style: styles.row },
                React.createElement(
                  Text,
                  { style: styles.label },
                  "Evaluations :"
                ),
                React.createElement(
                  Text,
                  { style: styles.value },
                  `${score.reviewScore}/100`
                )
              ),
              React.createElement(
                View,
                { style: styles.row },
                React.createElement(
                  Text,
                  { style: styles.label },
                  "Completude :"
                ),
                React.createElement(
                  Text,
                  { style: styles.value },
                  `${score.completenessScore}/100`
                )
              )
            )
          : null,

        // Badge Payeur
        React.createElement(
          View,
          { style: styles.section },
          React.createElement(
            Text,
            { style: styles.sectionTitle },
            "Payeur Verifie"
          ),
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(
              Text,
              { style: styles.label },
              "Statut :"
            ),
            React.createElement(
              Text,
              { style: styles.value },
              exportData.paymentBadge.verifiedMonths
                ? `Payeur verifie — ${exportData.paymentBadge.verifiedMonths} mois`
                : "Non verifie"
            )
          ),
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(
              Text,
              { style: styles.label },
              "Mois verifies :"
            ),
            React.createElement(
              Text,
              { style: styles.value },
              String(exportData.paymentBadge.verifiedMonths)
            )
          ),
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(
              Text,
              { style: styles.label },
              "Ponctualite :"
            ),
            React.createElement(
              Text,
              { style: styles.value },
              exportData.paymentBadge.punctualityRate
                ? `${exportData.paymentBadge.punctualityRate}%`
                : "N/A"
            )
          )
        ),

        // Rental History
        React.createElement(
          View,
          { style: styles.section },
          React.createElement(
            Text,
            { style: styles.sectionTitle },
            "Historique Locatif"
          ),
          ...exportData.rentalHistory.map((rh, i) =>
            React.createElement(
              View,
              { key: i, style: styles.historyItem },
              React.createElement(
                Text,
                { style: { fontFamily: "Helvetica-Bold" } },
                `${rh.city}${rh.zipCode ? ` (${rh.zipCode})` : ""} - ${rh.propertyType}`
              ),
              React.createElement(
                Text,
                null,
                `${formatDate(rh.startDate)} - ${formatDate(rh.endDate)}`
              ),
              React.createElement(
                Text,
                null,
                `Loyer : ${formatCents(rh.rentAmountCents)} | Source : ${rh.source} | Verifie : ${rh.isVerified ? "Oui" : "Non"}`
              ),
              rh.landlordReview
                ? React.createElement(
                    Text,
                    null,
                    `Evaluation : ${rh.landlordReview.compositeScore.toFixed(2)}/3.00`
                  )
                : null
            )
          )
        ),

        // Footer
        React.createElement(
          Text,
          { style: styles.footer },
          "Ce document a ete genere automatiquement par Coridor. Les donnees verifiees sont marquees comme telles."
        )
      )
    );

    // Render PDF to buffer
    const stream = await ReactPDF.renderToStream(doc as any);
    const chunks: Uint8Array[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on("data", (chunk: Uint8Array) => chunks.push(chunk));
      stream.on("end", () => resolve());
      stream.on("error", (err: Error) => reject(err));
    });
    const pdfBuffer = Buffer.concat(chunks);

    return {
      data: pdfBuffer,
      contentType: "application/pdf",
      fileName: `passeport-locatif-${new Date().toISOString().split("T")[0]}.pdf`,
    };
  }

  // ── i) onLeaseSigned — Auto-create RentalHistory (section 10.4) ──

  static async onLeaseSigned(rentalApplicationId: string) {
    const application = await prisma.rentalApplication.findUnique({
      where: { id: rentalApplicationId },
      include: {
        listing: {
          include: {
            rentalUnit: { include: { property: true } },
          },
        },
        candidateScope: true,
        financials: { orderBy: { startDate: "desc" }, take: 1 },
      },
    });

    if (!application) return;

    const property = application.listing.rentalUnit.property;
    const financial = application.financials[0];

    // Find the TenantProfile of the tenant
    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId: application.candidateScope.creatorUserId },
    });
    if (!tenantProfile) return;

    // Map property type
    const categoryMap: Record<string, RentalPropertyType> = {
      Apartment: "APARTMENT",
      House: "HOUSE",
      Studio: "STUDIO",
    };

    await prisma.rentalHistory.upsert({
      where: { rentalApplicationId: application.id },
      create: {
        tenantProfileId: tenantProfile.id,
        source: "CORIDOR",
        rentalApplicationId: application.id,
        city: property.city || "Inconnue",
        zipCode: property.zipCode,
        propertyType: categoryMap[property.category] || "APARTMENT",
        rentAmountCents: financial
          ? financial.baseRentCents + financial.serviceChargesCents
          : null,
        startDate: financial?.startDate || new Date(),
        isVerified: true,
      },
      update: {}, // Do nothing if already exists
    });
  }

  // ── j) consentToReview — Tenant consents to share an evaluation ──

  static async consentToReview(userId: string, reviewId: string) {
    // Verify the review belongs to this tenant
    const review = await prisma.landlordReview.findUnique({
      where: { id: reviewId },
      include: {
        rentalHistory: {
          include: {
            tenantProfile: { select: { userId: true } },
          },
        },
      },
    });

    if (!review) {
      throw new Error("Evaluation introuvable");
    }

    if (review.rentalHistory.tenantProfile.userId !== userId) {
      throw new Error("Non autorise");
    }

    return prisma.landlordReview.update({
      where: { id: reviewId },
      data: {
        tenantConsented: true,
        consentedAt: new Date(),
      },
    });
  }

  // ── Helper: Edit manual rental history ───────────────────────────

  static async editManualRentalHistory(
    userId: string,
    rentalHistoryId: string,
    data: Partial<ManualRentalHistoryInput>
  ) {
    const profile = await prisma.tenantProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new Error("Profil locataire introuvable");
    }

    const entry = await prisma.rentalHistory.findFirst({
      where: {
        id: rentalHistoryId,
        tenantProfileId: profile.id,
        source: "MANUAL",
      },
    });

    if (!entry) {
      throw new Error(
        "Entree introuvable, non autorisee, ou bail Coridor (non modifiable)"
      );
    }

    return prisma.rentalHistory.update({
      where: { id: rentalHistoryId },
      data: {
        ...(data.city !== undefined && { city: data.city }),
        ...(data.zipCode !== undefined && { zipCode: data.zipCode }),
        ...(data.propertyType !== undefined && {
          propertyType: data.propertyType,
        }),
        ...(data.rentAmountCents !== undefined && {
          rentAmountCents: data.rentAmountCents,
        }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.endDate !== undefined && { endDate: data.endDate }),
        ...(data.landlordName !== undefined && {
          landlordName: data.landlordName,
        }),
      },
    });
  }

  // ── Helper: Delete manual rental history ─────────────────────────

  static async deleteManualRentalHistory(
    userId: string,
    rentalHistoryId: string
  ) {
    const profile = await prisma.tenantProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new Error("Profil locataire introuvable");
    }

    const entry = await prisma.rentalHistory.findFirst({
      where: {
        id: rentalHistoryId,
        tenantProfileId: profile.id,
        source: "MANUAL",
      },
    });

    if (!entry) {
      throw new Error(
        "Entree introuvable, non autorisee, ou bail Coridor (non supprimable)"
      );
    }

    return prisma.rentalHistory.delete({
      where: { id: rentalHistoryId },
    });
  }
}
