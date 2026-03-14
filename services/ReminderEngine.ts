import { DiagnosticReminders } from './reminders/DiagnosticReminders';
import { LeaseReminders } from './reminders/LeaseReminders';
import { TaxReminders } from './reminders/TaxReminders';
import { AdminReminders } from './reminders/AdminReminders';
import { TaxAndPropertyReminderSync } from './reminders/TaxAndPropertyReminderSync';
import prisma from '@/libs/prismadb';
import { createNotification } from '@/libs/notifications';
import { sendEmail } from '@/lib/email';
import { EmailTemplate } from '@/components/emails/EmailTemplate';
import { createElement } from 'react';
import { getServerTranslation } from '@/lib/serverTranslations';

/**
 * Orchestrateur principal du systeme de rappels legaux.
 *
 * Responsabilites :
 * - Synchroniser les rappels pour les biens (diagnostics) et les baux
 * - Executer le cron quotidien (mise a jour des statuts + envoi des notifications)
 * - Marquer les rappels comme completes ou ignores
 */
export class ReminderEngine {

  /**
   * Sync tous les rappels diagnostics pour un bien donne.
   */
  static async syncRemindersForProperty(propertyId: string): Promise<void> {
    await DiagnosticReminders.sync(propertyId);
  }

  /**
   * Sync tous les rappels lies a un bail donne.
   */
  static async syncRemindersForLease(applicationId: string): Promise<void> {
    await LeaseReminders.sync(applicationId);
  }

  /**
   * Cron quotidien — met a jour les statuts et envoie les notifications.
   *
   * Etapes :
   * 1. Marquer comme OVERDUE les rappels dont la dueDate est passee
   * 2. Marquer comme UPCOMING les rappels dont la reminderDate est passee
   * 3. Envoyer les notifications pour les rappels UPCOMING non encore notifies
   * 4. Envoyer les secondes notifications si secondReminderDate est passee
   * 5. Sync les rappels fiscaux pour tous les proprietaires
   */
  static async dailyCronJob(): Promise<{ updated: number; notified: number; overdue: number }> {
    const t = getServerTranslation('emails');
    const now = new Date();
    let updated = 0;
    let notified = 0;
    let overdue = 0;

    // 1. Marquer comme OVERDUE les rappels dont la dueDate est passee
    const overdueResult = await prisma.legalReminder.updateMany({
      where: {
        status: { in: ['PENDING', 'UPCOMING', 'NOTIFIED'] },
        dueDate: { lt: now }
      },
      data: { status: 'OVERDUE' }
    });
    overdue = overdueResult.count;

    // 2. Marquer comme UPCOMING les rappels dont la reminderDate est passee
    const upcomingResult = await prisma.legalReminder.updateMany({
      where: {
        status: 'PENDING',
        reminderDate: { lte: now },
        dueDate: { gt: now }
      },
      data: { status: 'UPCOMING' }
    });
    updated = upcomingResult.count;

    // 3. Envoyer les notifications pour les rappels UPCOMING non encore notifies
    const toNotify = await prisma.legalReminder.findMany({
      where: {
        status: 'UPCOMING',
        notifiedAt: null,
        reminderDate: { lte: now }
      },
      include: { user: true, property: true }
    });

    for (const reminder of toNotify) {
      try {
        if (!reminder.userId) {
          // Admin reminder — send email to ADMIN_EMAIL instead of in-app notification
          const adminEmail = process.env.ADMIN_EMAIL;
          if (adminEmail) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://coridor.fr';
            await sendEmail(
              adminEmail,
              `[Admin] ${reminder.title}`,
              createElement(
                EmailTemplate,
                {
                  heading: t('reminder.adminHeading'),
                  actionLabel: t('reminder.adminAction'),
                  actionUrl: reminder.actionUrl || `${appUrl}/admin`,
                  footerCopyright: t('common.footer.copyright', { year: String(new Date().getFullYear()) }),
                  footerDisclaimer: t('common.footer.disclaimer'),
                  children: null,
                },
                createElement('p', { style: { margin: '0 0 16px' } }, reminder.title),
                createElement('p', { style: { margin: '0 0 16px', color: '#666' } },
                  reminder.description || ''),
                createElement('p', { style: { margin: '0 0 16px', fontWeight: '600' } },
                  t('reminder.deadline', { date: reminder.dueDate.toLocaleDateString('fr-FR') }))
              )
            );
          }
        } else {
          // User reminder — in-app notification + email
          await createNotification({
            userId: reminder.userId,
            type: 'LEGAL_REMINDER',
            title: reminder.title,
            message: reminder.description || t('reminder.defaultDeadlineMessage', { date: reminder.dueDate.toLocaleDateString('fr-FR') }),
            link: reminder.actionUrl || '/account/reminders'
          });

          if (reminder.user?.email) {
            const userName = reminder.user.firstName || reminder.user.name || t('reminder.defaultLandlordName');
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://coridor.fr';

            await sendEmail(
              reminder.user.email,
              t('reminder.legalEmailSubject', { title: reminder.title }),
              createElement(
                EmailTemplate,
                {
                  heading: t('reminder.importantReminder', { name: userName }),
                  actionLabel: t('reminder.viewReminders'),
                  actionUrl: `${appUrl}/account/reminders`,
                  footerCopyright: t('common.footer.copyright', { year: String(new Date().getFullYear()) }),
                  footerDisclaimer: t('common.footer.disclaimer'),
                  children: null,
                },
                createElement('p', { style: { margin: '0 0 16px' } }, reminder.title),
                createElement('p', { style: { margin: '0 0 16px', color: '#666' } },
                  reminder.description || ''),
                createElement('p', { style: { margin: '0 0 16px', fontWeight: '600' } },
                  t('reminder.deadline', { date: reminder.dueDate.toLocaleDateString('fr-FR') }))
              )
            );
          }
        }

        await prisma.legalReminder.update({
          where: { id: reminder.id },
          data: { notifiedAt: now, status: 'NOTIFIED' }
        });

        notified++;
      } catch (err) {
        console.error(`[Reminders] Failed to notify reminder ${reminder.id}:`, err);
      }
    }

    // 4. Envoyer les secondes notifications
    const toSecondNotify = await prisma.legalReminder.findMany({
      where: {
        status: 'NOTIFIED',
        secondNotifiedAt: null,
        secondReminderDate: { not: null, lte: now },
        dueDate: { gt: now }
      },
      include: { user: true }
    });

    for (const reminder of toSecondNotify) {
      try {
        if (!reminder.userId) {
          // Admin reminder — email only
          const adminEmail = process.env.ADMIN_EMAIL;
          if (adminEmail) {
            await sendEmail(
              adminEmail,
              `[Admin URGENT] ${reminder.title}`,
              createElement(
                EmailTemplate,
                {
                  heading: t('reminder.adminUrgentHeading'),
                  actionLabel: t('reminder.adminAction'),
                  actionUrl: reminder.actionUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://coridor.fr'}/admin`,
                  footerCopyright: t('common.footer.copyright', { year: String(new Date().getFullYear()) }),
                  footerDisclaimer: t('common.footer.disclaimer'),
                  children: null,
                },
                createElement('p', { style: { margin: '0 0 16px', fontWeight: '600' } },
                  t('reminder.imminentDeadline', { title: reminder.title })),
                createElement('p', { style: { margin: '0 0 16px', color: '#666' } },
                  reminder.description || '')
              )
            );
          }
        } else {
          await createNotification({
            userId: reminder.userId,
            type: 'LEGAL_REMINDER',
            title: t('reminder.urgentTitle', { title: reminder.title }),
            message: t('reminder.urgentMessage', { description: reminder.description || '' }),
            link: reminder.actionUrl || '/account/reminders'
          });
        }

        await prisma.legalReminder.update({
          where: { id: reminder.id },
          data: { secondNotifiedAt: now }
        });
      } catch (err) {
        console.error(`[Reminders] Failed to send 2nd notification for ${reminder.id}:`, err);
      }
    }

    // 5. Sync les rappels fiscaux pour tous les proprietaires
    await TaxReminders.syncAll();

    // 6. Sync les rappels taxes & obligations propriétaire (11 types)
    await TaxAndPropertyReminderSync.syncAll();

    // 7. Sync les rappels admin (ANIL, encadrement loyers)
    await AdminReminders.syncAll();

    return { updated, notified, overdue };
  }

  /**
   * Marquer un rappel comme complete.
   */
  static async completeReminder(reminderId: string, userId: string): Promise<void> {
    await prisma.legalReminder.updateMany({
      where: { id: reminderId, userId },
      data: { status: 'COMPLETED', completedAt: new Date() }
    });
  }

  /**
   * Ignorer un rappel avec une raison optionnelle.
   */
  static async dismissReminder(reminderId: string, userId: string, reason?: string): Promise<void> {
    await prisma.legalReminder.updateMany({
      where: { id: reminderId, userId },
      data: { status: 'DISMISSED', dismissedAt: new Date(), dismissReason: reason }
    });
  }
}
