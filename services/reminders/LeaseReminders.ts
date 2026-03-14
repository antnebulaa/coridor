import prisma from "@/libs/prismadb";
import { LegalReminderType, LegalReminderPriority } from "@prisma/client";
import { getServerTranslation } from '@/lib/serverTranslations';

/**
 * Calcule et synchronise les rappels lies aux baux (RentalApplication).
 *
 * Types geres :
 * - LEASE_END_NOTICE_LANDLORD : preavis de conge bailleur
 * - RENT_REVISION_IRL : date de revision annuelle (sans dupliquer le calcul)
 * - CHARGES_REGULARIZATION : regularisation annuelle des charges
 * - DEPOSIT_RETURN_DEADLINE : restitution du depot de garantie
 * - TENANT_INSURANCE_CHECK : verification annuelle de l'attestation d'assurance
 */
export class LeaseReminders {

  static async sync(applicationId: string): Promise<void> {
    const application = await prisma.rentalApplication.findUnique({
      where: { id: applicationId },
      include: {
        listing: {
          include: {
            rentalUnit: {
              include: {
                property: true
              }
            }
          }
        },
        financials: {
          orderBy: { startDate: 'asc' }
        },
        reconciliationHistory: {
          orderBy: { periodEnd: 'desc' },
          take: 1
        }
      }
    });

    if (!application || application.leaseStatus !== 'SIGNED') return;

    const property = application.listing.rentalUnit.property;
    const rentalUnit = application.listing.rentalUnit;
    const userId = property.ownerId;
    const isFurnished = rentalUnit.isFurnished;

    // --- LEASE_END_NOTICE_LANDLORD ---
    await this.syncLeaseEndNotice(application, userId, property.id, isFurnished);

    // --- RENT_REVISION_IRL ---
    await this.syncRentRevision(application, userId, property);

    // --- CHARGES_REGULARIZATION ---
    await this.syncChargesRegularization(application, userId, property.id);

    // --- DEPOSIT_RETURN_DEADLINE ---
    await this.syncDepositReturn(application, userId, property.id);

    // --- TENANT_INSURANCE_CHECK ---
    await this.syncTenantInsurance(application, userId, property.id);
  }

  /**
   * LEASE_END_NOTICE_LANDLORD
   * Bail vide : preavis 6 mois -> rappel 7 mois avant
   * Bail meuble : preavis 3 mois -> rappel 4 mois avant
   */
  private static async syncLeaseEndNotice(
    application: any,
    userId: string,
    propertyId: string,
    isFurnished: boolean
  ): Promise<void> {
    if (!application.leaseEndDate) return;

    const t = getServerTranslation('emails');
    const leaseEndDate = new Date(application.leaseEndDate);
    const noticeMonths = isFurnished ? 3 : 6;
    const reminderMonthsBefore = noticeMonths + 1;
    const leaseType = isFurnished ? t('reminder.lease.furnished') : t('reminder.lease.unfurnished');

    await this.upsertReminder({
      userId,
      propertyId,
      rentalApplicationId: application.id,
      type: LegalReminderType.LEASE_END_NOTICE_LANDLORD,
      priority: LegalReminderPriority.CRITICAL,
      title: t('reminder.lease.endNotice.title', { type: leaseType }),
      description: isFurnished
        ? t('reminder.lease.endNotice.descriptionFurnished', { date: formatDate(leaseEndDate) })
        : t('reminder.lease.endNotice.descriptionUnfurnished', { date: formatDate(leaseEndDate) }),
      legalReference: isFurnished ? 'Art. 25-8 Loi du 6 juillet 1989' : 'Art. 15 Loi du 6 juillet 1989',
      actionUrl: '/properties',
      dueDate: addMonths(leaseEndDate, -noticeMonths),
      reminderDate: addMonths(leaseEndDate, -reminderMonthsBefore),
      secondReminderDate: addMonths(leaseEndDate, -noticeMonths),
      sourceField: 'RentalApplication.leaseEndDate'
    });
  }

  /**
   * RENT_REVISION_IRL
   * Date anniversaire du bail = startDate du premier LeaseFinancials.
   * Rappel 1 mois avant.
   * IMPORTANT : ne cree PAS de rappel si le DPE est F ou G (gel des loyers).
   */
  private static async syncRentRevision(
    application: any,
    userId: string,
    property: any
  ): Promise<void> {
    if (!application.financials || application.financials.length === 0) return;

    // Verifier que le DPE n'est pas F/G (gel des loyers)
    const dpe = property.dpe?.toUpperCase();
    if (dpe === 'F' || dpe === 'G') {
      // Marquer les eventuels rappels IRL existants comme completes
      await prisma.legalReminder.updateMany({
        where: {
          rentalApplicationId: application.id,
          type: LegalReminderType.RENT_REVISION_IRL,
          status: { notIn: ['COMPLETED', 'DISMISSED'] }
        },
        data: { status: 'COMPLETED', completedAt: new Date() }
      });
      return;
    }

    const firstFinancial = application.financials[0];
    const leaseStartDate = new Date(firstFinancial.startDate);

    // Prochaine date anniversaire
    const now = new Date();
    const nextAnniversary = getNextAnniversary(leaseStartDate, now);

    const t = getServerTranslation('emails');
    await this.upsertReminder({
      userId,
      propertyId: property.id,
      rentalApplicationId: application.id,
      type: LegalReminderType.RENT_REVISION_IRL,
      priority: LegalReminderPriority.HIGH,
      title: t('reminder.lease.rentRevision.title'),
      description: t('reminder.lease.rentRevision.description'),
      legalReference: 'Art. 17-1 Loi du 6 juillet 1989',
      actionUrl: '/properties',
      dueDate: nextAnniversary,
      reminderDate: addMonths(nextAnniversary, -1),
      sourceField: 'LeaseFinancials.startDate',
      recurrenceRule: 'YEARLY'
    });
  }

  /**
   * CHARGES_REGULARIZATION
   * Chaque annee, rappel 2 mois avant la fin de l'annee civile (= 1er novembre).
   * Verifie si une regularisation a deja ete faite pour l'annee en cours.
   */
  private static async syncChargesRegularization(
    application: any,
    userId: string,
    propertyId: string
  ): Promise<void> {
    const now = new Date();
    const currentYear = now.getFullYear();

    // Verifier si une regularisation a deja ete faite pour l'annee en cours
    const lastReconciliation = application.reconciliationHistory?.[0];
    if (lastReconciliation) {
      const reconciliationYear = new Date(lastReconciliation.periodEnd).getFullYear();
      if (reconciliationYear >= currentYear) {
        // Regularisation deja faite pour l'annee en cours, marquer comme complete
        await prisma.legalReminder.updateMany({
          where: {
            rentalApplicationId: application.id,
            type: LegalReminderType.CHARGES_REGULARIZATION,
            status: { notIn: ['COMPLETED', 'DISMISSED'] },
            dueDate: {
              gte: new Date(`${currentYear}-01-01`),
              lte: new Date(`${currentYear}-12-31`)
            }
          },
          data: { status: 'COMPLETED', completedAt: new Date() }
        });
        return;
      }
    }

    // Date limite : 31 decembre de l'annee en cours
    const dueDate = new Date(`${currentYear}-12-31`);
    // Rappel : 1er novembre
    const reminderDate = new Date(`${currentYear}-11-01`);
    // Second rappel : 1er decembre
    const secondReminderDate = new Date(`${currentYear}-12-01`);

    const tCharges = getServerTranslation('emails');
    await this.upsertReminder({
      userId,
      propertyId,
      rentalApplicationId: application.id,
      type: LegalReminderType.CHARGES_REGULARIZATION,
      priority: LegalReminderPriority.HIGH,
      title: tCharges('reminder.lease.chargesRegularization.title'),
      description: tCharges('reminder.lease.chargesRegularization.description'),
      legalReference: 'Art. 23 Loi du 6 juillet 1989',
      actionUrl: '/properties',
      dueDate,
      reminderDate,
      secondReminderDate,
      sourceField: 'ReconciliationHistory',
      recurrenceRule: 'YEARLY'
    });
  }

  /**
   * DEPOSIT_RETURN_DEADLINE
   * Se declenche quand keysReturnDate est renseigne.
   * Deadline = keysReturnDate + 2 mois (par defaut, cas pessimiste).
   */
  private static async syncDepositReturn(
    application: any,
    userId: string,
    propertyId: string
  ): Promise<void> {
    if (!application.keysReturnDate) return;

    const keysReturnDate = new Date(application.keysReturnDate);
    // Par defaut, 2 mois (cas EDL non conforme). 1 mois si conforme, mais on prend le pire cas.
    const deadline = addMonths(keysReturnDate, 2);

    const tDeposit = getServerTranslation('emails');
    await this.upsertReminder({
      userId,
      propertyId,
      rentalApplicationId: application.id,
      type: LegalReminderType.DEPOSIT_RETURN_DEADLINE,
      priority: LegalReminderPriority.CRITICAL,
      title: tDeposit('reminder.lease.depositReturn.title'),
      description: tDeposit('reminder.lease.depositReturn.description'),
      legalReference: 'Art. 22 Loi du 6 juillet 1989',
      actionUrl: '/properties',
      dueDate: deadline,
      reminderDate: keysReturnDate,
      secondReminderDate: addMonths(keysReturnDate, 1),
      sourceField: 'RentalApplication.keysReturnDate'
    });
  }

  /**
   * TENANT_INSURANCE_CHECK
   * Date anniversaire du bail = rappel annuel pour demander l'attestation.
   * Si tenantInsuranceLastDate existe et < 1 an, pas de rappel.
   */
  private static async syncTenantInsurance(
    application: any,
    userId: string,
    propertyId: string
  ): Promise<void> {
    if (!application.financials || application.financials.length === 0) return;

    // Si l'attestation d'assurance a ete fournie il y a moins d'un an, pas de rappel
    if (application.tenantInsuranceLastDate) {
      const lastInsuranceDate = new Date(application.tenantInsuranceLastDate);
      const oneYearAgo = addYears(new Date(), -1);
      if (lastInsuranceDate > oneYearAgo) {
        // Assurance a jour, marquer les rappels existants comme completes
        await prisma.legalReminder.updateMany({
          where: {
            rentalApplicationId: application.id,
            type: LegalReminderType.TENANT_INSURANCE_CHECK,
            status: { notIn: ['COMPLETED', 'DISMISSED'] }
          },
          data: { status: 'COMPLETED', completedAt: new Date() }
        });
        return;
      }
    }

    const firstFinancial = application.financials[0];
    const leaseStartDate = new Date(firstFinancial.startDate);
    const now = new Date();
    const nextAnniversary = getNextAnniversary(leaseStartDate, now);

    const tInsurance = getServerTranslation('emails');
    await this.upsertReminder({
      userId,
      propertyId,
      rentalApplicationId: application.id,
      type: LegalReminderType.TENANT_INSURANCE_CHECK,
      priority: LegalReminderPriority.MEDIUM,
      title: tInsurance('reminder.lease.tenantInsurance.title'),
      description: tInsurance('reminder.lease.tenantInsurance.description'),
      legalReference: 'Art. 7g Loi du 6 juillet 1989',
      actionUrl: '/properties',
      dueDate: nextAnniversary,
      reminderDate: addMonths(nextAnniversary, -1),
      sourceField: 'RentalApplication.tenantInsuranceLastDate',
      recurrenceRule: 'YEARLY'
    });
  }

  /**
   * Upsert un rappel : cree ou met a jour un rappel existant actif pour le meme type + application.
   */
  private static async upsertReminder(data: {
    userId: string;
    propertyId: string;
    rentalApplicationId: string;
    type: LegalReminderType;
    priority: LegalReminderPriority;
    title: string;
    description: string;
    legalReference: string;
    actionUrl: string;
    dueDate: Date;
    reminderDate: Date;
    secondReminderDate?: Date;
    sourceField: string;
    recurrenceRule?: string;
  }): Promise<void> {
    const existing = await prisma.legalReminder.findFirst({
      where: {
        rentalApplicationId: data.rentalApplicationId,
        type: data.type,
        status: { notIn: ['COMPLETED', 'DISMISSED'] }
      }
    });

    if (existing) {
      await prisma.legalReminder.update({
        where: { id: existing.id },
        data: {
          dueDate: data.dueDate,
          reminderDate: data.reminderDate,
          secondReminderDate: data.secondReminderDate,
          title: data.title,
          description: data.description
        }
      });
    } else {
      await prisma.legalReminder.create({
        data: {
          userId: data.userId,
          propertyId: data.propertyId,
          rentalApplicationId: data.rentalApplicationId,
          type: data.type,
          priority: data.priority,
          title: data.title,
          description: data.description,
          legalReference: data.legalReference,
          actionUrl: data.actionUrl,
          dueDate: data.dueDate,
          reminderDate: data.reminderDate,
          secondReminderDate: data.secondReminderDate,
          isAutoGenerated: true,
          sourceField: data.sourceField,
          recurrenceRule: data.recurrenceRule
        }
      });
    }
  }
}

// --- Date helpers ---

function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Calcule la prochaine date anniversaire a partir de la date de debut du bail.
 * Si la date anniversaire de cette annee est passee, retourne celle de l'annee prochaine.
 */
function getNextAnniversary(startDate: Date, fromDate: Date): Date {
  const anniversary = new Date(startDate);
  anniversary.setFullYear(fromDate.getFullYear());

  if (anniversary <= fromDate) {
    anniversary.setFullYear(anniversary.getFullYear() + 1);
  }

  return anniversary;
}
