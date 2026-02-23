import prisma from '@/libs/prismadb';
import { createNotification } from '@/libs/notifications';
import { sendPushNotification } from '@/app/lib/sendPushNotification';
import { sendEmail } from '@/lib/email';
import React from 'react';
import { EmailTemplate } from '@/components/emails/EmailTemplate';
import { TRANSITIONS, EVENT_TO_STATUS } from '@/lib/depositRules';
import type { SecurityDeposit, DepositEvent, DepositStatus, DepositEventType } from '@prisma/client';

type TransitionOpts = {
  actorType?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
  description?: string;
};

type SecurityDepositFull = SecurityDeposit & {
  events: DepositEvent[];
};

export class DepositService {
  /**
   * Initialize a SecurityDeposit when a lease is signed (Yousign webhook).
   */
  static async initializeDeposit(applicationId: string): Promise<SecurityDeposit> {
    // Check if already exists
    const existing = await prisma.securityDeposit.findUnique({
      where: { applicationId },
    });
    if (existing) return existing;

    const application = await prisma.rentalApplication.findUnique({
      where: { id: applicationId },
      include: {
        listing: {
          select: {
            securityDeposit: true,
            price: true,
            leaseType: true,
            id: true,
            rentalUnit: {
              include: { property: { select: { ownerId: true } } },
            },
          },
        },
        candidateScope: { select: { creatorUserId: true } },
        financials: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { baseRentCents: true },
        },
      },
    });

    if (!application) throw new Error(`Application ${applicationId} not found`);

    // Calculate deposit amount
    let amountCents = application.listing.securityDeposit
      ? application.listing.securityDeposit * 100
      : 0;

    if (!amountCents) {
      // Fallback: 1× rent (unfurnished), 2× rent (furnished)
      const rent = application.listing.price;
      const isFurnished =
        application.listing.leaseType === 'SHORT_TERM' ||
        application.listing.leaseType === 'STUDENT';
      amountCents = rent * (isFurnished ? 2 : 1) * 100;
    }

    // Get monthly rent for penalty calculation
    const monthlyRentCents = application.financials[0]?.baseRentCents ?? application.listing.price * 100;

    const deposit = await prisma.securityDeposit.create({
      data: {
        applicationId,
        amountCents,
        status: 'AWAITING_PAYMENT',
        leaseSignedAt: new Date(),
        monthlyRentCents,
        events: {
          create: {
            type: 'LEASE_SIGNED',
            description: `Bail signé — dépôt de ${(amountCents / 100).toFixed(2)}€ dû`,
            actorType: 'system',
          },
        },
      },
    });

    // Inject conversation message
    const landlordId = application.listing.rentalUnit.property.ownerId;
    const tenantId = application.candidateScope?.creatorUserId;
    await DepositService.injectConversationMessage(
      deposit,
      'LEASE_SIGNED',
      application.listing.id,
      landlordId,
      tenantId ?? null
    );

    return deposit;
  }

  /**
   * State machine transition.
   */
  static async transition(
    depositId: string,
    event: DepositEventType,
    opts: TransitionOpts = {}
  ): Promise<SecurityDeposit> {
    const deposit = await prisma.securityDeposit.findUnique({
      where: { id: depositId },
      include: {
        application: {
          include: {
            listing: {
              select: {
                id: true,
                rentalUnit: {
                  include: { property: { select: { ownerId: true } } },
                },
              },
            },
            candidateScope: { select: { creatorUserId: true } },
          },
        },
      },
    });

    if (!deposit) throw new Error(`SecurityDeposit ${depositId} not found`);

    const allowed = TRANSITIONS[deposit.status] || [];
    if (!allowed.includes(event)) {
      throw new Error(
        `Invalid transition: ${deposit.status} + ${event}. Allowed: ${allowed.join(', ')}`
      );
    }

    const targetStatus = EVENT_TO_STATUS[event];
    if (!targetStatus) {
      throw new Error(`No target status for event ${event}`);
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status: targetStatus,
    };

    // Set date fields based on event
    switch (event) {
      case 'PAYMENT_DETECTED':
      case 'PAYMENT_CONFIRMED':
        updateData.paidAt = new Date();
        if (opts.metadata?.powensTransactionId) {
          updateData.powensTransactionId = opts.metadata.powensTransactionId;
        }
        updateData.paymentConfirmedBy = opts.actorType === 'powens' ? 'powens' : `manual_${opts.actorType || 'landlord'}`;
        break;
      case 'EXIT_INSPECTION_STARTED':
      case 'EXIT_INSPECTION_SIGNED':
        updateData.exitInspectionAt = new Date();
        break;
      case 'RETENTIONS_PROPOSED':
        updateData.retentionsProposedAt = new Date();
        break;
      case 'TENANT_AGREED':
      case 'TENANT_PARTIAL_AGREED':
      case 'TENANT_DISPUTED':
        updateData.tenantRespondedAt = new Date();
        break;
      case 'FULL_RELEASE':
        updateData.releasedAt = new Date();
        if (opts.metadata?.refundedAmountCents != null) {
          updateData.refundedAmountCents = opts.metadata.refundedAmountCents;
        }
        if (opts.metadata?.retainedAmountCents != null) {
          updateData.retainedAmountCents = opts.metadata.retainedAmountCents;
        }
        updateData.refundConfirmedBy = opts.actorType === 'powens' ? 'powens' : `manual_${opts.actorType || 'landlord'}`;
        break;
      case 'RESOLVED':
        updateData.resolvedAt = new Date();
        break;
    }

    const description =
      opts.description || DepositService.getDefaultDescription(event, deposit);

    const updated = await prisma.securityDeposit.update({
      where: { id: depositId },
      data: {
        ...updateData,
        events: {
          create: {
            type: event,
            description,
            actorType: opts.actorType || 'system',
            actorId: opts.actorId,
            metadata: opts.metadata ? (opts.metadata as object) : undefined,
          },
        },
      },
    });

    // ⚠️ PAID → HELD chaining: auto-chain immediately, no zombie state
    if (targetStatus === 'PAID') {
      return DepositService.transition(depositId, 'PAYMENT_CONFIRMED', {
        ...opts,
        description: 'Dépôt détenu par le propriétaire',
      }).catch(() => {
        // If already HELD (race condition), just return
        return prisma.securityDeposit.update({
          where: { id: depositId },
          data: { status: 'HELD' },
        });
      });
    }

    // Inject conversation message
    const landlordId = deposit.application.listing.rentalUnit.property.ownerId;
    const tenantId = deposit.application.candidateScope?.creatorUserId ?? null;
    await DepositService.injectConversationMessage(
      updated,
      event,
      deposit.application.listing.id,
      landlordId,
      tenantId
    );

    // Email for critical events
    if (event === 'RETENTIONS_PROPOSED' && tenantId) {
      DepositService.sendDepositEmail(
        tenantId,
        'Dépôt de garantie — Retenues proposées',
        'Le propriétaire a proposé des retenues',
        `Le propriétaire a proposé des retenues sur votre dépôt de garantie. Consultez le détail et donnez votre réponse depuis votre espace Coridor.`,
        'Consulter et répondre',
        `/deposit/${deposit.applicationId}`,
      ).catch(console.error);
    }

    // Update landlord badge on resolution
    if (targetStatus === 'FULLY_RELEASED' || targetStatus === 'RESOLVED') {
      DepositService.updateLandlordBadge(depositId).catch(console.error);
    }

    return updated;
  }

  /**
   * Validate deductions against deposit amount.
   * Returns warning if deductions exceed deposit (no blocking).
   */
  static validateDeductions(
    deposit: SecurityDeposit,
    totalDeductionsCents: number
  ): { isValid: boolean; warning?: string; surplusCents?: number } {
    if (totalDeductionsCents <= deposit.amountCents) {
      return { isValid: true };
    }

    const surplusCents = totalDeductionsCents - deposit.amountCents;
    return {
      isValid: true, // Never blocks — just warns
      warning: `Les retenues (${(totalDeductionsCents / 100).toFixed(2)}€) dépassent le montant du dépôt (${(deposit.amountCents / 100).toFixed(2)}€). Le surplus de ${(surplusCents / 100).toFixed(2)}€ devra être réclamé directement au locataire.`,
      surplusCents,
    };
  }

  /**
   * Calculate legal deadline for deposit return.
   * 1 month if EDL is "conforme", 2 months otherwise.
   * Reference date = tenantSignedAt on the EXIT inspection.
   */
  static async calculateLegalDeadline(depositId: string): Promise<Date> {
    const deposit = await prisma.securityDeposit.findUnique({
      where: { id: depositId },
      include: {
        application: {
          include: {
            inspections: {
              where: { type: 'EXIT', status: 'SIGNED' },
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                rooms: {
                  include: {
                    elements: {
                      where: {
                        condition: { in: ['DEGRADED', 'OUT_OF_SERVICE'] },
                        isAbsent: false,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!deposit) throw new Error(`SecurityDeposit ${depositId} not found`);

    const exitInspection = deposit.application.inspections[0];
    if (!exitInspection?.tenantSignedAt) {
      throw new Error('No signed EXIT inspection found');
    }

    // Check if EDL has anomalies
    const hasAnomalies = exitInspection.rooms.some(
      (r) => r.elements.length > 0
    );

    const months = hasAnomalies ? 2 : 1;
    const deadline = new Date(exitInspection.tenantSignedAt);
    deadline.setMonth(deadline.getMonth() + months);

    await prisma.securityDeposit.update({
      where: { id: depositId },
      data: {
        legalDeadline: deadline,
        legalDeadlineMonths: months,
      },
    });

    return deadline;
  }

  /**
   * Check all deposits for overdue status. Called by cron.
   */
  static async checkAllOverdue(): Promise<{
    checked: number;
    newOverdue: number;
    penaltiesUpdated: number;
  }> {
    const now = new Date();

    const deposits = await prisma.securityDeposit.findMany({
      where: {
        legalDeadline: { lt: now },
        status: {
          in: ['EXIT_INSPECTION', 'RETENTIONS_PROPOSED', 'PARTIALLY_RELEASED', 'DISPUTED'],
        },
        resolvedAt: null,
      },
      include: {
        application: {
          include: {
            listing: {
              select: {
                rentalUnit: {
                  include: { property: { select: { ownerId: true, title: true } } },
                },
              },
            },
            candidateScope: { select: { creatorUserId: true } },
          },
        },
      },
    });

    let newOverdue = 0;
    let penaltiesUpdated = 0;

    for (const deposit of deposits) {
      const wasOverdue = deposit.isOverdue;

      // Calculate months overdue
      const msOverdue = now.getTime() - deposit.legalDeadline!.getTime();
      const overdueMonths = Math.max(1, Math.ceil(msOverdue / (30 * 24 * 60 * 60 * 1000)));

      // Penalty: 10% of monthly rent per overdue month (art. 22 al. 2 loi 89-462)
      const penaltyAmountCents = deposit.monthlyRentCents
        ? Math.round(deposit.monthlyRentCents * 0.1 * overdueMonths)
        : 0;

      await prisma.securityDeposit.update({
        where: { id: deposit.id },
        data: {
          isOverdue: true,
          overdueMonths,
          penaltyAmountCents,
        },
      });

      if (!wasOverdue) {
        newOverdue++;
        // Create overdue event
        await prisma.depositEvent.create({
          data: {
            depositId: deposit.id,
            type: 'DEADLINE_OVERDUE',
            description: `Délai légal dépassé — pénalité de ${(penaltyAmountCents / 100).toFixed(2)}€`,
            actorType: 'cron',
          },
        });

        // Notify landlord + tenant on first overdue
        const landlordId = deposit.application.listing.rentalUnit.property.ownerId;
        const tenantId = deposit.application.candidateScope?.creatorUserId;
        const propertyTitle = deposit.application.listing.rentalUnit.property.title || 'votre bien';
        const penaltyDisplay = (penaltyAmountCents / 100).toFixed(0);
        const depositLink = `/deposit/${deposit.applicationId}`;

        await createNotification({
          userId: landlordId,
          type: 'deposit',
          title: 'Délai de restitution dépassé',
          message: `Le délai légal de restitution du dépôt pour ${propertyTitle} est dépassé. Pénalité : ${penaltyDisplay}€.`,
          link: depositLink,
        });

        sendPushNotification({
          userId: landlordId,
          title: 'Dépôt — délai dépassé',
          body: `Pénalité de ${penaltyDisplay}€. Restituez le dépôt.`,
          url: depositLink,
        }).catch(console.error);

        DepositService.sendDepositEmail(
          landlordId,
          'Dépôt de garantie — Délai de restitution dépassé',
          'Délai de restitution dépassé',
          `Le délai légal de restitution du dépôt de garantie pour ${propertyTitle} est dépassé. Une pénalité de ${penaltyDisplay}€ s'applique (10% du loyer par mois de retard, article 22 de la loi du 6 juillet 1989). Restituez le dépôt pour éviter des pénalités supplémentaires.`,
          'Voir le suivi',
          depositLink,
        ).catch(console.error);

        if (tenantId) {
          await createNotification({
            userId: tenantId,
            type: 'deposit',
            title: 'Dépôt non restitué dans les délais',
            message: `Le délai de restitution de votre dépôt pour ${propertyTitle} est dépassé. Pénalité applicable : ${penaltyDisplay}€.`,
            link: depositLink,
          });

          sendPushNotification({
            userId: tenantId,
            title: 'Dépôt — délai dépassé',
            body: `Votre dépôt n'a pas été restitué dans les délais.`,
            url: depositLink,
          }).catch(console.error);

          DepositService.sendDepositEmail(
            tenantId,
            'Dépôt de garantie — Délai dépassé',
            'Votre dépôt n\'a pas été restitué',
            `Le délai légal de restitution de votre dépôt de garantie pour ${propertyTitle} est dépassé. Une pénalité de ${penaltyDisplay}€ s'applique en votre faveur. Vous pouvez consulter votre espace pour connaître vos options.`,
            'Voir mes options',
            depositLink,
          ).catch(console.error);
        }
      } else if (penaltyAmountCents !== deposit.penaltyAmountCents) {
        penaltiesUpdated++;
        await prisma.depositEvent.create({
          data: {
            depositId: deposit.id,
            type: 'PENALTY_UPDATED',
            description: `Pénalité mise à jour : ${(penaltyAmountCents / 100).toFixed(2)}€ (${overdueMonths} mois de retard)`,
            actorType: 'cron',
            metadata: { overdueMonths, penaltyAmountCents },
          },
        });
      }
    }

    return { checked: deposits.length, newOverdue, penaltiesUpdated };
  }

  /**
   * Send J-7 pre-deadline reminders. Called by cron.
   */
  static async sendPreDeadlineReminders(): Promise<number> {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const eightDaysFromNow = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

    // Find deposits with deadline in 7 days that haven't received a warning yet
    const deposits = await prisma.securityDeposit.findMany({
      where: {
        legalDeadline: {
          gte: sevenDaysFromNow,
          lt: eightDaysFromNow,
        },
        isOverdue: false,
        status: {
          in: ['EXIT_INSPECTION', 'RETENTIONS_PROPOSED', 'PARTIALLY_RELEASED'],
        },
        events: {
          none: { type: 'DEADLINE_WARNING' },
        },
      },
      include: {
        application: {
          include: {
            listing: {
              select: {
                rentalUnit: {
                  include: { property: { select: { ownerId: true } } },
                },
              },
            },
            candidateScope: { select: { creatorUserId: true } },
          },
        },
      },
    });

    for (const deposit of deposits) {
      const landlordId = deposit.application.listing.rentalUnit.property.ownerId;
      const tenantId = deposit.application.candidateScope?.creatorUserId;

      await prisma.depositEvent.create({
        data: {
          depositId: deposit.id,
          type: 'DEADLINE_WARNING',
          description: `Rappel : restitution du dépôt dans 7 jours`,
          actorType: 'cron',
        },
      });

      // Notify landlord
      await createNotification({
        userId: landlordId,
        type: 'deposit',
        title: 'Restitution du dépôt — 7 jours restants',
        message: `Le délai légal de restitution du dépôt de garantie expire dans 7 jours. Pensez à restituer le dépôt au locataire.`,
        link: `/deposit/${deposit.applicationId}`,
      });

      sendPushNotification({
        userId: landlordId,
        title: 'Dépôt de garantie — 7 jours',
        body: 'Le délai de restitution expire dans 7 jours.',
        url: `/deposit/${deposit.applicationId}`,
      });

      DepositService.sendDepositEmail(
        landlordId,
        'Dépôt de garantie — 7 jours restants',
        'Restitution du dépôt dans 7 jours',
        `Le délai légal de restitution du dépôt de garantie expire dans 7 jours. Pensez à restituer le dépôt au locataire pour éviter les pénalités prévues par la loi.`,
        'Voir le suivi',
        `/deposit/${deposit.applicationId}`,
      ).catch(console.error);

      // Notify tenant
      if (tenantId) {
        await createNotification({
          userId: tenantId,
          type: 'deposit',
          title: 'Restitution du dépôt — 7 jours',
          message: `Le propriétaire doit restituer votre dépôt de garantie sous 7 jours.`,
          link: `/deposit/${deposit.applicationId}`,
        });

        sendPushNotification({
          userId: tenantId,
          title: 'Dépôt de garantie — 7 jours',
          body: 'Votre dépôt doit être restitué sous 7 jours.',
          url: `/deposit/${deposit.applicationId}`,
        });

        DepositService.sendDepositEmail(
          tenantId,
          'Dépôt de garantie — Restitution dans 7 jours',
          'Votre dépôt doit être restitué',
          `Le propriétaire doit restituer votre dépôt de garantie sous 7 jours. Vous pouvez suivre l'avancement depuis votre espace.`,
          'Voir le suivi',
          `/deposit/${deposit.applicationId}`,
        ).catch(console.error);
      }
    }

    return deposits.length;
  }

  /**
   * Send J+15 post-deadline reminders. Called by cron.
   */
  static async sendPostDeadlineReminders(): Promise<number> {
    const now = new Date();
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    const sixteenDaysAgo = new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000);

    const deposits = await prisma.securityDeposit.findMany({
      where: {
        legalDeadline: {
          gte: sixteenDaysAgo,
          lt: fifteenDaysAgo,
        },
        isOverdue: true,
        status: {
          in: ['EXIT_INSPECTION', 'RETENTIONS_PROPOSED', 'PARTIALLY_RELEASED', 'DISPUTED'],
        },
        events: {
          none: { type: 'SECOND_REMINDER' },
        },
      },
      include: {
        application: {
          include: {
            listing: {
              select: {
                rentalUnit: {
                  include: { property: { select: { ownerId: true } } },
                },
              },
            },
            candidateScope: { select: { creatorUserId: true } },
          },
        },
      },
    });

    for (const deposit of deposits) {
      const landlordId = deposit.application.listing.rentalUnit.property.ownerId;
      const tenantId = deposit.application.candidateScope?.creatorUserId;

      await prisma.depositEvent.create({
        data: {
          depositId: deposit.id,
          type: 'SECOND_REMINDER',
          description: `Second rappel — J+15 après expiration du délai légal`,
          actorType: 'cron',
        },
      });

      // Strong reminder to landlord
      await createNotification({
        userId: landlordId,
        type: 'deposit',
        title: 'Dépôt de garantie en retard — Action requise',
        message: `Le délai légal de restitution est dépassé de 15 jours. Une pénalité de ${(deposit.penaltyAmountCents / 100).toFixed(2)}€ s'applique. Restituez le dépôt pour éviter des pénalités supplémentaires.`,
        link: `/deposit/${deposit.applicationId}`,
      });

      sendPushNotification({
        userId: landlordId,
        title: 'Dépôt en retard — pénalité en cours',
        body: `Pénalité de ${(deposit.penaltyAmountCents / 100).toFixed(2)}€. Restituez le dépôt.`,
        url: `/deposit/${deposit.applicationId}`,
      });

      DepositService.sendDepositEmail(
        landlordId,
        'Dépôt de garantie — Retard de 15 jours',
        'Dépôt en retard — Action urgente requise',
        `Le délai légal de restitution du dépôt de garantie est dépassé de 15 jours. Une pénalité de ${(deposit.penaltyAmountCents / 100).toFixed(0)}€ s'applique. Restituez le dépôt pour limiter les pénalités.`,
        'Restituer le dépôt',
        `/deposit/${deposit.applicationId}`,
      ).catch(console.error);

      // Suggest formal notice to tenant
      if (tenantId) {
        await createNotification({
          userId: tenantId,
          type: 'deposit',
          title: 'Dépôt non restitué — Vous pouvez agir',
          message: `Votre dépôt n'a pas été restitué dans les délais. Vous pouvez générer une mise en demeure depuis votre espace.`,
          link: `/deposit/${deposit.applicationId}`,
        });

        sendPushNotification({
          userId: tenantId,
          title: 'Dépôt non restitué',
          body: 'Vous pouvez générer une mise en demeure.',
          url: `/deposit/${deposit.applicationId}`,
        });

        DepositService.sendDepositEmail(
          tenantId,
          'Dépôt de garantie — Vous pouvez agir',
          'Votre dépôt n\'a toujours pas été restitué',
          `Votre dépôt de garantie n'a pas été restitué dans les délais légaux. Vous pouvez générer une mise en demeure depuis votre espace Coridor pour faire valoir vos droits.`,
          'Générer une mise en demeure',
          `/deposit/${deposit.applicationId}`,
        ).catch(console.error);
      }
    }

    return deposits.length;
  }

  /**
   * Update landlord badge when deposit is returned on time.
   */
  static async updateLandlordBadge(depositId: string): Promise<void> {
    const deposit = await prisma.securityDeposit.findUnique({
      where: { id: depositId },
      include: {
        application: {
          include: {
            listing: {
              select: {
                rentalUnit: {
                  include: { property: { select: { ownerId: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!deposit) return;

    const landlordId = deposit.application.listing.rentalUnit.property.ownerId;

    // Increment total
    await prisma.user.update({
      where: { id: landlordId },
      data: { depositsTotal: { increment: 1 } },
    });

    // Check if returned before deadline
    if (deposit.legalDeadline && deposit.releasedAt && deposit.releasedAt <= deposit.legalDeadline) {
      await prisma.user.update({
        where: { id: landlordId },
        data: { depositsReturnedOnTime: { increment: 1 } },
      });
    }
  }

  /**
   * Mark formal notice as sent.
   */
  static async markFormalNoticeSent(depositId: string, sentDate: Date): Promise<void> {
    await prisma.securityDeposit.update({
      where: { id: depositId },
      data: { formalNoticeSentAt: sentDate },
    });

    await prisma.depositEvent.create({
      data: {
        depositId,
        type: 'FORMAL_NOTICE_SENT',
        description: `Mise en demeure envoyée le ${sentDate.toLocaleDateString('fr-FR')}`,
        actorType: 'tenant',
      },
    });
  }

  /**
   * Get full deposit timeline.
   */
  static async getTimeline(depositId: string): Promise<DepositEvent[]> {
    return prisma.depositEvent.findMany({
      where: { depositId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get full deposit with all relations.
   */
  static async getFullDeposit(applicationId: string): Promise<SecurityDepositFull | null> {
    return prisma.securityDeposit.findUnique({
      where: { applicationId },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
        depositResolution: true,
        application: {
          include: {
            listing: {
              select: {
                id: true,
                title: true,
                price: true,
                securityDeposit: true,
                rentalUnit: {
                  include: {
                    property: {
                      select: {
                        id: true,
                        ownerId: true,
                        title: true,
                        city: true,
                      },
                    },
                  },
                },
              },
            },
            candidateScope: {
              select: {
                creatorUserId: true,
                creatorUser: { select: { name: true, firstName: true } },
              },
            },
          },
        },
      },
    });
  }

  // --- Private helpers ---

  /**
   * Inject a system message in the conversation between landlord and tenant.
   */
  private static async injectConversationMessage(
    deposit: SecurityDeposit,
    eventType: DepositEventType | string,
    listingId: string,
    landlordId: string,
    tenantId: string | null
  ): Promise<void> {
    if (!tenantId) return;

    try {
      const conversation = await prisma.conversation.findFirst({
        where: {
          listingId,
          users: { every: { id: { in: [landlordId, tenantId] } } },
        },
      });

      if (!conversation) return;

      await prisma.message.create({
        data: {
          body: `DEPOSIT_EVENT|${eventType}|${deposit.amountCents}|${deposit.applicationId}`,
          conversation: { connect: { id: conversation.id } },
          sender: { connect: { id: landlordId } },
          seen: { connect: { id: landlordId } },
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });
    } catch (err) {
      console.error('[DepositService] Failed to inject conversation message:', err);
    }
  }

  /**
   * Send a branded email to a user regarding their deposit.
   */
  private static async sendDepositEmail(
    userId: string,
    subject: string,
    heading: string,
    bodyText: string,
    actionLabel?: string,
    actionPath?: string,
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (!user?.email) return;

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://coridor.fr';

      await sendEmail(
        user.email,
        subject,
        React.createElement(
          EmailTemplate,
          {
            heading,
            actionLabel,
            actionUrl: actionPath ? `${appUrl}${actionPath}` : undefined,
          },
          React.createElement('p', { style: { margin: 0 } }, bodyText)
        )
      );
    } catch (err) {
      console.error('[DepositService] Email failed:', err);
    }
  }

  private static getDefaultDescription(
    event: DepositEventType,
    deposit: SecurityDeposit
  ): string {
    const amount = (deposit.amountCents / 100).toFixed(2);
    const descriptions: Partial<Record<DepositEventType, string>> = {
      LEASE_SIGNED: `Bail signé — dépôt de ${amount}€ dû`,
      PAYMENT_DETECTED: `Versement du dépôt détecté`,
      PAYMENT_CONFIRMED: `Versement du dépôt confirmé (${amount}€)`,
      ENTRY_INSPECTION_DONE: `État des lieux d'entrée réalisé`,
      EXIT_INSPECTION_STARTED: `État des lieux de sortie démarré`,
      EXIT_INSPECTION_SIGNED: `État des lieux de sortie signé`,
      RETENTIONS_PROPOSED: `Retenues proposées par le propriétaire`,
      TENANT_AGREED: `Locataire accepte les retenues`,
      TENANT_PARTIAL_AGREED: `Accord partiel du locataire`,
      TENANT_DISPUTED: `Locataire conteste les retenues`,
      PARTIAL_RELEASE: `Restitution partielle du dépôt`,
      FULL_RELEASE: `Dépôt restitué intégralement`,
      DEADLINE_WARNING: `Rappel : restitution dans 7 jours`,
      DEADLINE_OVERDUE: `Délai légal de restitution dépassé`,
      PENALTY_UPDATED: `Pénalité mise à jour`,
      FORMAL_NOTICE_GENERATED: `Mise en demeure générée`,
      FORMAL_NOTICE_SENT: `Mise en demeure envoyée`,
      CDC_DOSSIER_GENERATED: `Dossier CDC généré`,
      TIMELINE_EXPORTED: `Timeline exportée`,
      RESOLVED: `Dépôt de garantie — dossier clos`,
      SECOND_REMINDER: `Second rappel — J+15 après expiration`,
      DEDUCTION_EXCEEDS_DEPOSIT: `Les retenues dépassent le montant du dépôt`,
    };
    return descriptions[event] || `Événement : ${event}`;
  }
}
