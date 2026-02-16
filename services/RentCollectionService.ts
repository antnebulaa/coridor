import prisma from "@/libs/prismadb";
import { createNotification } from "@/libs/notifications";
import { sendEmail } from "@/lib/email";

const MOIS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/**
 * Formate une adresse lisible à partir d'un objet Property.
 */
function formatAddress(property: {
  addressLine1?: string | null;
  apartment?: string | null;
  building?: string | null;
  zipCode?: string | null;
  city?: string | null;
  address?: string | null;
}): string {
  const parts: string[] = [];
  if (property.addressLine1) parts.push(property.addressLine1);
  if (property.apartment) parts.push(`Appt ${property.apartment}`);
  if (property.building) parts.push(`Bat ${property.building}`);
  if (property.zipCode && property.city)
    parts.push(`${property.zipCode} ${property.city}`);
  return parts.join(", ") || property.address || "Adresse non renseignée";
}

export class RentCollectionService {
  /**
   * Le 1er du mois : créer un RentPaymentTracking pour chaque bail actif
   * qui n'a pas encore d'entrée pour ce mois.
   */
  static async generateMonthlyTracking(): Promise<{
    created: number;
    skipped: number;
    errors: number;
  }> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    // 1. Récupérer tous les baux actifs (leaseStatus = 'SIGNED') avec LeaseFinancials actifs
    const signedLeases = await prisma.rentalApplication.findMany({
      where: { leaseStatus: "SIGNED" },
      include: {
        financials: {
          orderBy: { startDate: "desc" },
        },
        candidateScope: {
          include: {
            creatorUser: {
              include: {
                tenantProfile: true,
              },
            },
          },
        },
      },
    });

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const lease of signedLeases) {
      try {
        // a. Récupérer le LeaseFinancials actif (endDate = null)
        const activeFinancial = lease.financials.find((f) => f.endDate === null);
        if (!activeFinancial) {
          skipped++;
          continue;
        }

        // Vérifier que le bail a commencé (ne pas créer si startDate est ce mois)
        const leaseStart = new Date(activeFinancial.startDate);
        if (
          leaseStart.getFullYear() === currentYear &&
          leaseStart.getMonth() + 1 === currentMonth
        ) {
          // Premier mois du bail, on skip
          skipped++;
          continue;
        }

        // Vérifier que le bail a déjà commencé (pas dans le futur)
        const currentMonthStart = new Date(currentYear, currentMonth - 1, 1);
        if (leaseStart > currentMonthStart) {
          skipped++;
          continue;
        }

        // b. Montant attendu
        const expectedAmountCents =
          activeFinancial.baseRentCents + activeFinancial.serviceChargesCents;

        // c. Jour de paiement
        const rentPaymentDate =
          lease.candidateScope?.creatorUser?.tenantProfile?.rentPaymentDate ?? 5;

        // Construire la date attendue
        // Gérer les mois avec moins de jours (ex: février)
        const maxDaysInMonth = new Date(
          currentYear,
          currentMonth,
          0
        ).getDate();
        const paymentDay = Math.min(rentPaymentDate, maxDaysInMonth);
        const expectedDate = new Date(
          currentYear,
          currentMonth - 1,
          paymentDay
        );

        // d. Upsert le RentPaymentTracking
        await prisma.rentPaymentTracking.upsert({
          where: {
            rentalApplicationId_periodMonth_periodYear: {
              rentalApplicationId: lease.id,
              periodMonth: currentMonth,
              periodYear: currentYear,
            },
          },
          create: {
            rentalApplicationId: lease.id,
            periodMonth: currentMonth,
            periodYear: currentYear,
            expectedAmountCents,
            expectedDate,
          },
          update: {}, // Ne rien faire si déjà existant
        });

        created++;
      } catch (err) {
        errors++;
        console.error(
          `[RentCollection] Error generating tracking for lease ${lease.id}:`,
          err
        );
      }
    }

    return { created, skipped, errors };
  }

  /**
   * Chercher les BankTransactions matchées et mettre à jour les statuts.
   */
  static async checkPayments(): Promise<{
    checked: number;
    matched: number;
    partial: number;
  }> {
    // 1. Récupérer tous les trackings PENDING ou LATE du mois courant et des mois passés
    const pendingTrackings = await prisma.rentPaymentTracking.findMany({
      where: {
        status: { in: ["PENDING", "LATE", "REMINDER_SENT"] },
      },
      include: {
        rentalApplication: {
          include: {
            matchedTransactions: true,
          },
        },
      },
    });

    let checked = 0;
    let matched = 0;
    let partial = 0;

    for (const tracking of pendingTrackings) {
      checked++;

      try {
        // a. Chercher une BankTransaction matchée au bail pour le mois correspondant
        const monthStart = new Date(
          tracking.periodYear,
          tracking.periodMonth - 1,
          1
        );
        const monthEnd = new Date(
          tracking.periodYear,
          tracking.periodMonth,
          0,
          23,
          59,
          59
        );

        const matchedTxs =
          tracking.rentalApplication.matchedTransactions.filter((tx) => {
            const txDate = new Date(tx.date);
            return txDate >= monthStart && txDate <= monthEnd;
          });

        if (matchedTxs.length === 0) continue;

        // Calculer le total payé (les transactions peuvent être créditées en positif)
        const totalPaidCents = matchedTxs.reduce(
          (sum, tx) => sum + Math.round(Math.abs(tx.amount) * 100),
          0
        );

        // b. Vérifier le montant (tolérance +/- 5%)
        const expectedCents = tracking.expectedAmountCents;
        const lowerBound = expectedCents * 0.95;
        const upperBound = expectedCents * 1.05;

        const isFullPayment =
          totalPaidCents >= lowerBound && totalPaidCents <= upperBound * 1.1; // un peu de marge haute
        const isPartial =
          totalPaidCents >= expectedCents * 0.5 && totalPaidCents < lowerBound;

        if (isFullPayment || isPartial) {
          await prisma.rentPaymentTracking.update({
            where: { id: tracking.id },
            data: {
              status: "PAID",
              detectedAmountCents: totalPaidCents,
              detectedDate: matchedTxs[0].date,
              transactionId: matchedTxs[0].id,
              isPartialPayment: isPartial,
            },
          });

          matched++;
          if (isPartial) partial++;
        }
      } catch (err) {
        console.error(
          `[RentCollection] Error checking payment for tracking ${tracking.id}:`,
          err
        );
      }
    }

    return { checked, matched, partial };
  }

  /**
   * Envoyer les relances selon le workflow temporel.
   * J+5  -> LATE + notification proprio
   * J+10 -> email proprio
   * J+15 -> OVERDUE + notification
   * J+30 -> CRITICAL
   */
  static async processReminders(): Promise<{
    lateNotified: number;
    emailsSent: number;
    overdueNotified: number;
    criticalNotified: number;
  }> {
    const now = new Date();

    // Récupérer les trackings non résolus dont la date attendue est passée
    const trackings = await prisma.rentPaymentTracking.findMany({
      where: {
        status: { in: ["PENDING", "LATE", "REMINDER_SENT", "OVERDUE"] },
        expectedDate: { lt: now },
      },
      include: {
        rentalApplication: {
          include: {
            listing: {
              include: {
                rentalUnit: {
                  include: {
                    property: {
                      include: { owner: true },
                    },
                  },
                },
              },
            },
            candidateScope: {
              include: {
                creatorUser: true,
              },
            },
          },
        },
      },
    });

    let lateNotified = 0;
    let emailsSent = 0;
    let overdueNotified = 0;
    let criticalNotified = 0;

    for (const tracking of trackings) {
      try {
        const expectedDate = new Date(tracking.expectedDate);
        const diffMs = now.getTime() - expectedDate.getTime();
        const daysLate = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        const property =
          tracking.rentalApplication.listing.rentalUnit.property;
        const landlord = property.owner;
        const landlordId = landlord.id;
        const address = formatAddress(property);
        const monthName = MOIS_FR[tracking.periodMonth - 1];

        // PENDING et J+5 -> passer a LATE + notification proprio
        if (tracking.status === "PENDING" && daysLate >= 5) {
          await prisma.rentPaymentTracking.update({
            where: { id: tracking.id },
            data: { status: "LATE" },
          });

          await createNotification({
            userId: landlordId,
            type: "RENT_LATE",
            title: "Loyer non détecté",
            message: `Loyer de ${monthName} non détecté pour ${address}. Vérifiez vos relevés.`,
            link: "/dashboard/finances",
          });

          lateNotified++;
        }

        // LATE (ou REMINDER_SENT) et J+10 et reminderSentAt est null -> email proprio
        if (
          (tracking.status === "LATE" || tracking.status === "REMINDER_SENT") &&
          daysLate >= 10 &&
          !tracking.reminderSentAt
        ) {
          const landlordEmail = landlord.email;
          if (landlordEmail) {
            const htmlContent = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Suivi loyer - ${monthName} ${tracking.periodYear}</h2>
                <p>Bonjour,</p>
                <p>Nous n'avons pas encore détecté le paiement du loyer de <strong>${monthName} ${tracking.periodYear}</strong> pour votre bien situé au <strong>${address}</strong>.</p>
                <p>Montant attendu : <strong>${(tracking.expectedAmountCents / 100).toFixed(2)} &euro;</strong></p>
                <p>Si vous avez déjà reçu le paiement, vous pouvez le confirmer manuellement depuis votre espace Coridor.</p>
                <p>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://coridor.fr"}/dashboard/finances"
                     style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; border-radius: 8px; text-decoration: none;">
                    Voir mes finances
                  </a>
                </p>
                <p>L'équipe Coridor</p>
              </div>
            `;
            await sendEmail(
              landlordEmail,
              `Suivi loyer - Rappel ${monthName} ${tracking.periodYear}`,
              htmlContent
            );
          }

          await prisma.rentPaymentTracking.update({
            where: { id: tracking.id },
            data: { reminderSentAt: new Date() },
          });

          emailsSent++;
        }

        // LATE (ou REMINDER_SENT) et J+15 -> passer a OVERDUE + notification
        if (
          (tracking.status === "LATE" || tracking.status === "REMINDER_SENT") &&
          daysLate >= 15
        ) {
          await prisma.rentPaymentTracking.update({
            where: { id: tracking.id },
            data: {
              status: "OVERDUE",
              overdueNotifiedAt: new Date(),
            },
          });

          await createNotification({
            userId: landlordId,
            type: "RENT_OVERDUE",
            title: "Loyer impayé",
            message: `Le loyer de ${monthName} est toujours impayé pour ${address}.`,
            link: "/dashboard/finances",
          });

          overdueNotified++;
        }

        // OVERDUE et J+30 -> passer a CRITICAL
        if (tracking.status === "OVERDUE" && daysLate >= 30) {
          await prisma.rentPaymentTracking.update({
            where: { id: tracking.id },
            data: { status: "CRITICAL" },
          });

          await createNotification({
            userId: landlordId,
            type: "RENT_CRITICAL",
            title: "Alerte critique - Impayé",
            message: `Le loyer de ${monthName} n'est toujours pas réglé pour ${address}. Nous vous recommandons de prendre contact avec votre locataire.`,
            link: "/dashboard/finances",
          });

          criticalNotified++;
        }
      } catch (err) {
        console.error(
          `[RentCollection] Error processing reminders for tracking ${tracking.id}:`,
          err
        );
      }
    }

    return { lateNotified, emailsSent, overdueNotified, criticalNotified };
  }

  /**
   * Marquer un tracking comme reçu manuellement (le proprio confirme).
   */
  static async markAsPaid(
    trackingId: string,
    userId: string
  ): Promise<void> {
    // 1. Vérifier que le tracking existe
    const tracking = await prisma.rentPaymentTracking.findUnique({
      where: { id: trackingId },
      include: {
        rentalApplication: {
          include: {
            listing: {
              include: {
                rentalUnit: {
                  include: {
                    property: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!tracking) {
      throw new Error("Suivi de paiement introuvable");
    }

    // 2. Vérifier que le userId est le proprio
    const ownerId =
      tracking.rentalApplication.listing.rentalUnit.property.ownerId;
    if (ownerId !== userId) {
      throw new Error("Non autorisé");
    }

    // 3. Mettre à jour
    await prisma.rentPaymentTracking.update({
      where: { id: trackingId },
      data: {
        status: "MANUALLY_CONFIRMED",
        manuallyConfirmedAt: new Date(),
      },
    });
  }

  /**
   * Envoyer un rappel amiable au locataire via la messagerie Coridor.
   * C'est un message envoyé dans la conversation du bail.
   */
  static async sendFriendlyReminder(
    trackingId: string,
    userId: string
  ): Promise<void> {
    // 1. Récupérer le tracking avec les relations nécessaires
    const tracking = await prisma.rentPaymentTracking.findUnique({
      where: { id: trackingId },
      include: {
        rentalApplication: {
          include: {
            listing: {
              include: {
                rentalUnit: {
                  include: {
                    property: true,
                  },
                },
              },
            },
            candidateScope: {
              include: {
                creatorUser: true,
              },
            },
          },
        },
      },
    });

    if (!tracking) {
      throw new Error("Suivi de paiement introuvable");
    }

    const property =
      tracking.rentalApplication.listing.rentalUnit.property;
    const landlordId = property.ownerId;

    // Vérifier que le userId est le proprio
    if (landlordId !== userId) {
      throw new Error("Non autorisé");
    }

    const tenant = tracking.rentalApplication.candidateScope.creatorUser;
    const tenantId = tenant.id;
    const tenantFirstName = tenant.firstName || tenant.name || "Locataire";
    const monthName = MOIS_FR[tracking.periodMonth - 1];
    const expectedAmount = (tracking.expectedAmountCents / 100).toFixed(2);

    // 2. Trouver la conversation liée au listing entre le proprio et le locataire
    const conversation = await prisma.conversation.findFirst({
      where: {
        listingId: tracking.rentalApplication.listingId,
        users: {
          every: {
            id: { in: [landlordId, tenantId] },
          },
        },
      },
    });

    if (!conversation) {
      throw new Error(
        "Aucune conversation trouvée entre le propriétaire et le locataire pour cette annonce"
      );
    }

    // 3. Créer le message dans la conversation
    const messageBody = `Bonjour ${tenantFirstName}, nous n'avons pas encore enregistré votre loyer de ${monthName} (montant attendu : ${expectedAmount}\u00a0\u20ac). Si vous avez déjà effectué le paiement, merci de ne pas tenir compte de ce message. En cas de difficulté, n'hésitez pas à en discuter avec votre propriétaire.`;

    await prisma.message.create({
      data: {
        body: messageBody,
        senderId: landlordId,
        conversationId: conversation.id,
      },
    });

    // Mettre à jour le lastMessageAt de la conversation
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    // 4. Mettre à jour le tracking
    await prisma.rentPaymentTracking.update({
      where: { id: trackingId },
      data: {
        status: "REMINDER_SENT",
        reminderSentAt: new Date(),
      },
    });

    // 5. Notification au locataire
    await createNotification({
      userId: tenantId,
      type: "RENT_REMINDER",
      title: "Rappel de loyer",
      message: `Un rappel concernant votre loyer de ${monthName} vous a été envoyé.`,
      link: "/conversations",
    });
  }

  /**
   * Ignorer un mois avec motif.
   */
  static async ignoreMonth(
    trackingId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    // 1. Vérifier que le tracking existe
    const tracking = await prisma.rentPaymentTracking.findUnique({
      where: { id: trackingId },
      include: {
        rentalApplication: {
          include: {
            listing: {
              include: {
                rentalUnit: {
                  include: {
                    property: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!tracking) {
      throw new Error("Suivi de paiement introuvable");
    }

    // 2. Vérifier ownership
    const ownerId =
      tracking.rentalApplication.listing.rentalUnit.property.ownerId;
    if (ownerId !== userId) {
      throw new Error("Non autorisé");
    }

    // 3. Mettre à jour
    await prisma.rentPaymentTracking.update({
      where: { id: trackingId },
      data: {
        status: "IGNORED",
        ignoreReason: reason,
      },
    });
  }
}
