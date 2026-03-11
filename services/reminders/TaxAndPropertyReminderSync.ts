import prisma from '@/libs/prismadb';
import { LegalReminderType, LegalReminderPriority } from '@prisma/client';
import {
  calculatePropertyTaxReminder,
  calculateTeomRecoveryReminder,
  calculateVacantPropertyTaxReminder,
  calculateSecondaryResidenceTaxReminder,
  calculateCfeReminder,
  calculateSocialContributionsReminder,
  calculateOccupancyDeclarationReminder,
  calculatePnoInsuranceReminder,
  calculateBoilerMaintenanceReminder,
  calculateEnergyBanReminder,
  calculateSmokeDetectorReminder,
  ReminderData,
} from './TaxAndPropertyReminders';

/**
 * Synchronise les rappels taxes & obligations propriétaire.
 *
 * Itère sur tous les biens, appelle les 11 calculateurs purs,
 * et upsert les résultats dans LegalReminder.
 *
 * Rappels par bien (9) :
 *   PROPERTY_TAX_DEADLINE, TEOM_RECOVERY, VACANT_PROPERTY_TAX,
 *   SECONDARY_RESIDENCE_TAX, CFE_DEADLINE, PNO_INSURANCE_RENEWAL,
 *   BOILER_MAINTENANCE_CHECK, ENERGY_BAN_DEADLINE, SMOKE_DETECTOR_CHECK
 *
 * Rappels par propriétaire (2) :
 *   SOCIAL_CONTRIBUTIONS_INFO, OCCUPANCY_DECLARATION
 */

// All property-level reminder types managed by this sync
const PROPERTY_REMINDER_TYPES: LegalReminderType[] = [
  'PROPERTY_TAX_DEADLINE',
  'TEOM_RECOVERY',
  'VACANT_PROPERTY_TAX',
  'SECONDARY_RESIDENCE_TAX',
  'CFE_DEADLINE',
  'PNO_INSURANCE_RENEWAL',
  'BOILER_MAINTENANCE_CHECK',
  'ENERGY_BAN_DEADLINE',
  'SMOKE_DETECTOR_CHECK',
];

const OWNER_REMINDER_TYPES: LegalReminderType[] = [
  'SOCIAL_CONTRIBUTIONS_INFO',
  'OCCUPANCY_DECLARATION',
];

export class TaxAndPropertyReminderSync {
  /**
   * Point d'entrée principal — appelé par ReminderEngine.dailyCronJob().
   */
  static async syncAll(): Promise<void> {
    const now = new Date();
    const currentYear = now.getFullYear();

    // Fetch all properties with minimal fields
    const properties = await prisma.property.findMany({
      select: {
        id: true,
        ownerId: true,
        address: true,
        city: true,
        isZoneTendue: true,
        vacantSince: true,
        propertyTaxAmountCents: true,
        teomAmountCents: true,
        pnoInsuranceExpiryDate: true,
        pnoInsuranceProvider: true,
        heatingSystem: true,
        lastBoilerMaintenanceDate: true,
        dpe: true,
        smokeDetectorInstalledAt: true,
        smokeDetectorCheckedAt: true,
        rentalUnits: {
          select: {
            isFurnished: true,
            listings: {
              where: { status: 'PUBLISHED' },
              select: { id: true, title: true },
              take: 1,
            },
          },
          take: 1,
        },
      },
    });

    const propertyIds = properties.map((p) => p.id);

    // Batch: active leases + existing reminders (avoids N+1)
    const [activeLeases, existingReminders] = await Promise.all([
      prisma.rentalApplication.findMany({
        where: {
          leaseStatus: 'SIGNED',
          listing: { status: 'PUBLISHED' },
          // Only active leases (no end date or end date in the future)
          OR: [
            { leaseEndDate: null },
            { leaseEndDate: { gt: now } },
          ],
        },
        select: {
          listing: {
            select: {
              rentalUnit: {
                select: { propertyId: true },
              },
            },
          },
        },
      }),
      // Batch fetch all active reminders for our types (eliminates N+1)
      prisma.legalReminder.findMany({
        where: {
          OR: [
            { propertyId: { in: propertyIds }, type: { in: PROPERTY_REMINDER_TYPES } },
            { type: { in: OWNER_REMINDER_TYPES } },
          ],
          status: { notIn: ['COMPLETED', 'DISMISSED'] },
        },
        select: { id: true, propertyId: true, userId: true, type: true },
      }),
    ]);

    const propertyIdsWithLease = new Set(
      activeLeases
        .map((a) => a.listing?.rentalUnit?.propertyId)
        .filter(Boolean) as string[]
    );

    // Build lookup map: "propertyId-type" → existingId (or "userId-null-type" for owner-level)
    const existingMap = new Map<string, string>();
    for (const r of existingReminders) {
      const key = r.propertyId
        ? `${r.propertyId}-${r.type}`
        : `${r.userId}-null-${r.type}`;
      existingMap.set(key, r.id);
    }

    // Track owners for per-owner reminders
    const ownerIds = new Set<string>();

    for (const prop of properties) {
      ownerIds.add(prop.ownerId);

      const isFurnished = prop.rentalUnits[0]?.isFurnished ?? false;
      const hasActiveLease = propertyIdsWithLease.has(prop.id);

      // Build a display title from listing title or address
      const title =
        prop.rentalUnits[0]?.listings[0]?.title ||
        [prop.address, prop.city].filter(Boolean).join(', ') ||
        'Bien sans titre';

      const propertyInput = {
        id: prop.id,
        title,
        isZoneTendue: prop.isZoneTendue,
        vacantSince: prop.vacantSince,
        propertyTaxAmountCents: prop.propertyTaxAmountCents,
        teomAmountCents: prop.teomAmountCents,
        pnoInsuranceExpiryDate: prop.pnoInsuranceExpiryDate,
        pnoInsuranceProvider: prop.pnoInsuranceProvider,
        heatingSystem: prop.heatingSystem,
        lastBoilerMaintenanceDate: prop.lastBoilerMaintenanceDate,
        dpe: prop.dpe,
        smokeDetectorInstalledAt: prop.smokeDetectorInstalledAt,
        smokeDetectorCheckedAt: prop.smokeDetectorCheckedAt,
      };

      // Use next year for tax deadlines if current year deadline already passed
      const taxYear = this.getTaxYear(now, currentYear);

      const reminders: (ReminderData | null)[] = [
        calculatePropertyTaxReminder(propertyInput, taxYear.propertyTax),
        calculateTeomRecoveryReminder(propertyInput, hasActiveLease, taxYear.teom),
        calculateVacantPropertyTaxReminder(propertyInput),
        calculateSecondaryResidenceTaxReminder(propertyInput, isFurnished, hasActiveLease, taxYear.secondaryResidence),
        calculateCfeReminder(propertyInput, isFurnished, taxYear.cfe),
        calculatePnoInsuranceReminder(propertyInput),
        calculateBoilerMaintenanceReminder(propertyInput),
        calculateEnergyBanReminder(propertyInput),
        calculateSmokeDetectorReminder(propertyInput),
      ];

      for (const reminder of reminders) {
        if (!reminder) continue;
        try {
          const existingId = existingMap.get(`${prop.id}-${reminder.type}`);
          await this.upsertReminder(prop.ownerId, prop.id, reminder, existingId);
        } catch (err) {
          console.error(`[TaxPropertyReminders] Failed to upsert ${reminder.type} for property ${prop.id}:`, err);
        }
      }
    }

    // Per-owner reminders: OCCUPANCY_DECLARATION + SOCIAL_CONTRIBUTIONS_INFO
    for (const ownerId of ownerIds) {
      try {
        // Occupancy declaration — use next year if deadline passed
        const occupancyYear = now.getMonth() >= 6 ? currentYear + 1 : currentYear; // After July → next year
        const occupancy = calculateOccupancyDeclarationReminder(ownerId, occupancyYear);
        const existingOccupancy = existingMap.get(`${ownerId}-null-OCCUPANCY_DECLARATION`);
        await this.upsertReminder(ownerId, null, occupancy, existingOccupancy);

        // Social contributions — need revenue data
        const prevYear = currentYear - 1;
        const prevYearStart = new Date(prevYear, 0, 1);
        const prevYearEnd = new Date(prevYear, 11, 31, 23, 59, 59);

        const ownerProperties = properties
          .filter((p) => p.ownerId === ownerId)
          .map((p) => p.id);

        if (ownerProperties.length > 0) {
          const [revenueAgg, expenseAgg] = await Promise.all([
            prisma.rentPaymentTracking.aggregate({
              _sum: { detectedAmountCents: true },
              where: {
                status: 'PAID',
                periodYear: prevYear,
                rentalApplication: {
                  listing: {
                    rentalUnit: { propertyId: { in: ownerProperties } },
                  },
                },
              },
            }),
            prisma.expense.aggregate({
              _sum: { amountTotalCents: true },
              where: {
                propertyId: { in: ownerProperties },
                dateOccurred: { gte: prevYearStart, lte: prevYearEnd },
              },
            }),
          ]);

          const totalRevenue = revenueAgg._sum?.detectedAmountCents ?? 0;
          const totalExpenses = expenseAgg._sum?.amountTotalCents ?? 0;
          const netRevenue = totalRevenue - totalExpenses;

          const social = calculateSocialContributionsReminder(ownerId, prevYear, netRevenue);
          if (social) {
            const existingSocial = existingMap.get(`${ownerId}-null-SOCIAL_CONTRIBUTIONS_INFO`);
            await this.upsertReminder(ownerId, null, social, existingSocial);
          }
        }
      } catch (err) {
        console.error(`[TaxPropertyReminders] Failed to sync owner reminders for ${ownerId}:`, err);
      }
    }
  }

  /**
   * Determine the correct year for each tax deadline.
   * If the current year deadline has already passed, use next year.
   */
  private static getTaxYear(now: Date, currentYear: number) {
    return {
      propertyTax: now.getMonth() >= 10 ? currentYear + 1 : currentYear,       // After Oct 15 → next year (month 10 = Nov)
      teom: now.getMonth() >= 11 ? currentYear + 1 : currentYear,              // After Dec → next year
      secondaryResidence: now.getMonth() >= 11 ? currentYear + 1 : currentYear, // After Dec 15 → next year
      cfe: now.getMonth() >= 11 ? currentYear + 1 : currentYear,               // After Dec 15 → next year
    };
  }

  /**
   * Upsert a reminder (property-level or owner-level).
   * Uses pre-fetched existingId to avoid N+1 queries.
   */
  private static async upsertReminder(
    userId: string,
    propertyId: string | null,
    data: ReminderData,
    existingId?: string,
  ): Promise<void> {
    if (existingId) {
      await prisma.legalReminder.update({
        where: { id: existingId },
        data: {
          dueDate: data.dueDate,
          reminderDate: data.reminderDate,
          secondReminderDate: data.secondReminderDate,
          title: data.title,
          description: data.description,
          priority: data.priority as LegalReminderPriority,
        },
      });
    } else {
      await prisma.legalReminder.create({
        data: {
          userId,
          propertyId,
          type: data.type as LegalReminderType,
          priority: data.priority as LegalReminderPriority,
          title: data.title,
          description: data.description,
          legalReference: data.legalReference,
          actionUrl: data.actionUrl,
          dueDate: data.dueDate,
          reminderDate: data.reminderDate,
          secondReminderDate: data.secondReminderDate,
          isAutoGenerated: true,
          sourceField: data.type,
          recurrenceRule: data.recurrenceRule,
        },
      });
    }
  }
}
