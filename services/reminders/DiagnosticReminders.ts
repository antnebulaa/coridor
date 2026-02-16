import prisma from "@/libs/prismadb";
import { LegalReminderType, LegalReminderPriority } from "@prisma/client";

/**
 * Calcule et synchronise les rappels diagnostics pour un bien donné.
 * Pour chaque type de diagnostic, vérifie si un rappel actif existe déjà (non COMPLETED/DISMISSED).
 * Si non, crée-le. Si oui, met à jour les dates si nécessaire.
 */
export class DiagnosticReminders {

  static async sync(propertyId: string): Promise<void> {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { owner: true }
    });
    if (!property) return;

    const userId = property.ownerId;

    // --- DPE EXPIRY ---
    // DPE valide 10 ans. Si dpeDate existe sans dpeExpiryDate, expiry = dpeDate + 10 ans
    // Rappels : 3 mois avant + 1 mois avant
    if (property.dpeExpiryDate || property.dpeDate) {
      const expiryDate = property.dpeExpiryDate
        || (property.dpeDate ? addYears(property.dpeDate, 10) : null);

      if (expiryDate) {
        await this.upsertReminder({
          userId,
          propertyId,
          type: LegalReminderType.DPE_EXPIRY,
          priority: LegalReminderPriority.CRITICAL,
          title: 'DPE — Diagnostic de Performance Energetique a renouveler',
          description: 'Le DPE de votre bien arrive a expiration. Un nouveau diagnostic doit etre realise avant de pouvoir relouer.',
          legalReference: 'Art. L126-26 CCH',
          actionUrl: '/properties',
          dueDate: expiryDate,
          reminderDate: addMonths(expiryDate, -3),
          secondReminderDate: addMonths(expiryDate, -1),
          sourceField: 'Property.dpeExpiryDate'
        });
      }
    }

    // --- ELECTRICAL DIAGNOSTIC EXPIRY ---
    // Valide 6 ans. Obligatoire si installation > 15 ans
    if (property.electricalDiagnosticDate) {
      const expiryDate = addYears(property.electricalDiagnosticDate, 6);
      await this.upsertReminder({
        userId,
        propertyId,
        type: LegalReminderType.ELECTRICAL_DIAGNOSTIC_EXPIRY,
        priority: LegalReminderPriority.CRITICAL,
        title: 'Diagnostic electricite a renouveler',
        description: 'Le diagnostic electricite expire. Obligatoire pour toute location si installation > 15 ans.',
        legalReference: 'Art. L134-7 CCH',
        actionUrl: '/properties',
        dueDate: expiryDate,
        reminderDate: addMonths(expiryDate, -3),
        secondReminderDate: addMonths(expiryDate, -1),
        sourceField: 'Property.electricalDiagnosticDate'
      });
    }

    // --- GAS DIAGNOSTIC EXPIRY ---
    // Valide 6 ans. Obligatoire si installation gaz
    if (property.hasGasInstallation && property.gasDiagnosticDate) {
      const expiryDate = addYears(property.gasDiagnosticDate, 6);
      await this.upsertReminder({
        userId,
        propertyId,
        type: LegalReminderType.GAS_DIAGNOSTIC_EXPIRY,
        priority: LegalReminderPriority.CRITICAL,
        title: 'Diagnostic gaz a renouveler',
        description: 'Le diagnostic gaz expire. Obligatoire pour toute location avec installation gaz de plus de 15 ans.',
        legalReference: 'Art. L134-6 CCH',
        actionUrl: '/properties',
        dueDate: expiryDate,
        reminderDate: addMonths(expiryDate, -3),
        secondReminderDate: addMonths(expiryDate, -1),
        sourceField: 'Property.gasDiagnosticDate'
      });
    }

    // --- ERP EXPIRY ---
    // Valide 6 mois seulement !
    if (property.erpDate) {
      const expiryDate = addMonths(property.erpDate, 6);
      await this.upsertReminder({
        userId,
        propertyId,
        type: LegalReminderType.ERP_EXPIRY,
        priority: LegalReminderPriority.HIGH,
        title: 'Etat des Risques et Pollutions (ERP) a renouveler',
        description: "L'ERP n'est valide que 6 mois. Il doit etre a jour lors de la signature du bail.",
        legalReference: "Art. L125-5 Code de l'environnement",
        actionUrl: '/properties',
        dueDate: expiryDate,
        reminderDate: addMonths(expiryDate, -1),
        secondReminderDate: addDays(expiryDate, -7),
        sourceField: 'Property.erpDate'
      });
    }

    // --- RENT FREEZE DPE F/G ---
    // Alerte permanente si DPE est F ou G
    const dpe = property.dpe?.toUpperCase();
    if (dpe === 'F' || dpe === 'G') {
      const existing = await prisma.legalReminder.findFirst({
        where: {
          propertyId,
          type: LegalReminderType.RENT_FREEZE_DPE_FG,
          status: { notIn: ['COMPLETED', 'DISMISSED'] }
        }
      });

      if (!existing) {
        const now = new Date();
        await prisma.legalReminder.create({
          data: {
            userId,
            propertyId,
            type: LegalReminderType.RENT_FREEZE_DPE_FG,
            priority: LegalReminderPriority.CRITICAL,
            title: `Gel des loyers — DPE ${dpe}`,
            description: dpe === 'G'
              ? 'Votre bien est classe DPE G. Il est interdit de le louer depuis le 1er janvier 2025. Vous devez realiser des travaux de renovation energetique.'
              : 'Votre bien est classe DPE F. Il sera interdit a la location a partir du 1er janvier 2028. Toute augmentation de loyer (y compris IRL) est interdite depuis aout 2022.',
            legalReference: 'Loi Climat et Resilience, Art. 159-160',
            actionUrl: '/properties',
            dueDate: dpe === 'G' ? new Date('2025-01-01') : new Date('2028-01-01'),
            reminderDate: now,
            status: 'UPCOMING',
            isAutoGenerated: true,
            sourceField: 'Property.dpe'
          }
        });
      }
    } else {
      // Si le DPE n'est plus F/G, marquer le rappel comme complete
      await prisma.legalReminder.updateMany({
        where: {
          propertyId,
          type: LegalReminderType.RENT_FREEZE_DPE_FG,
          status: { notIn: ['COMPLETED', 'DISMISSED'] }
        },
        data: { status: 'COMPLETED', completedAt: new Date() }
      });
    }
  }

  /**
   * Upsert un rappel : cree ou met a jour un rappel existant actif pour le meme type + property.
   */
  private static async upsertReminder(data: {
    userId: string;
    propertyId: string;
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
  }): Promise<void> {
    const existing = await prisma.legalReminder.findFirst({
      where: {
        propertyId: data.propertyId,
        type: data.type,
        status: { notIn: ['COMPLETED', 'DISMISSED'] }
      }
    });

    if (existing) {
      // Mettre a jour les dates si elles ont change
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
          sourceField: data.sourceField
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

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
