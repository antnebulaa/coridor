import prisma from '@/libs/prismadb';
import { createNotification } from '@/libs/notifications';
import { sendPushNotification } from '@/app/lib/sendPushNotification';
import { sendEmail } from '@/lib/email';
import React from 'react';
import { EmailTemplate } from '@/components/emails/EmailTemplate';
import { TRANSITIONS, EVENT_TO_STATUS } from '@/lib/depositRules';
import { getServerTranslation } from '@/lib/serverTranslations';
import type { SecurityDeposit, DepositEvent, DepositResolution, DepositStatus, DepositEventType, RentalApplication, Listing, RentalUnit, Property, TenantCandidateScope, User } from '@prisma/client';

type TransitionOpts = {
  actorType?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
  description?: string;
};

type SecurityDepositFull = SecurityDeposit & {
  events: DepositEvent[];
  depositResolution: DepositResolution | null;
  application: RentalApplication & {
    listing: Pick<Listing, 'id' | 'title' | 'price' | 'securityDeposit'> & {
      rentalUnit: RentalUnit & {
        property: Pick<Property, 'id' | 'ownerId' | 'city'>;
      };
    };
    candidateScope: (Pick<TenantCandidateScope, 'creatorUserId'> & {
      creatorUser: Pick<User, 'name' | 'firstName'>;
    }) | null;
  };
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
      const isFurnished = !!(application.listing.rentalUnit as any)?.isFurnished;
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
      const tChain = getServerTranslation('emails');
      return DepositService.transition(depositId, 'PAYMENT_CONFIRMED', {
        ...opts,
        description: tChain('deposit.events.heldByLandlord'),
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
      const t = getServerTranslation('emails');
      DepositService.sendDepositEmail(
        tenantId,
        t('deposit.retentionsProposed.emailSubject'),
        t('deposit.retentionsProposed.emailHeading'),
        t('deposit.retentionsProposed.emailBody'),
        t('deposit.retentionsProposed.emailAction'),
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
                title: true,
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
        const t = getServerTranslation('emails');
        const landlordId = deposit.application.listing.rentalUnit.property.ownerId;
        const tenantId = deposit.application.candidateScope?.creatorUserId;
        const propertyTitle = deposit.application.listing.title || t('deposit.defaultPropertyTitle');
        const penaltyDisplay = (penaltyAmountCents / 100).toFixed(0);
        const depositLink = `/deposit/${deposit.applicationId}`;

        await createNotification({
          userId: landlordId,
          type: 'deposit',
          title: t('deposit.overdue.landlordNotifTitle'),
          message: t('deposit.overdue.landlordNotifMessage', { property: propertyTitle, penalty: penaltyDisplay }),
          link: depositLink,
        });

        sendPushNotification({
          userId: landlordId,
          title: t('deposit.overdue.landlordPushTitle'),
          body: t('deposit.overdue.landlordPushBody', { penalty: penaltyDisplay }),
          url: depositLink,
        }).catch(console.error);

        DepositService.sendDepositEmail(
          landlordId,
          t('deposit.overdue.landlordEmailSubject'),
          t('deposit.overdue.landlordEmailHeading'),
          t('deposit.overdue.landlordEmailBody', { property: propertyTitle, penalty: penaltyDisplay }),
          t('deposit.overdue.landlordEmailAction'),
          depositLink,
        ).catch(console.error);

        if (tenantId) {
          await createNotification({
            userId: tenantId,
            type: 'deposit',
            title: t('deposit.overdue.tenantNotifTitle'),
            message: t('deposit.overdue.tenantNotifMessage', { property: propertyTitle, penalty: penaltyDisplay }),
            link: depositLink,
          });

          sendPushNotification({
            userId: tenantId,
            title: t('deposit.overdue.tenantPushTitle'),
            body: t('deposit.overdue.tenantPushBody'),
            url: depositLink,
          }).catch(console.error);

          DepositService.sendDepositEmail(
            tenantId,
            t('deposit.overdue.tenantEmailSubject'),
            t('deposit.overdue.tenantEmailHeading'),
            t('deposit.overdue.tenantEmailBody', { property: propertyTitle, penalty: penaltyDisplay }),
            t('deposit.overdue.tenantEmailAction'),
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

    const t = getServerTranslation('emails');

    for (const deposit of deposits) {
      const landlordId = deposit.application.listing.rentalUnit.property.ownerId;
      const tenantId = deposit.application.candidateScope?.creatorUserId;

      await prisma.depositEvent.create({
        data: {
          depositId: deposit.id,
          type: 'DEADLINE_WARNING',
          description: t('deposit.preDeadline.eventDescription'),
          actorType: 'cron',
        },
      });

      // Notify landlord
      await createNotification({
        userId: landlordId,
        type: 'deposit',
        title: t('deposit.preDeadline.landlordNotifTitle'),
        message: t('deposit.preDeadline.landlordNotifMessage'),
        link: `/deposit/${deposit.applicationId}`,
      });

      sendPushNotification({
        userId: landlordId,
        title: t('deposit.preDeadline.landlordPushTitle'),
        body: t('deposit.preDeadline.landlordPushBody'),
        url: `/deposit/${deposit.applicationId}`,
      });

      DepositService.sendDepositEmail(
        landlordId,
        t('deposit.preDeadline.landlordEmailSubject'),
        t('deposit.preDeadline.landlordEmailHeading'),
        t('deposit.preDeadline.landlordEmailBody'),
        t('deposit.preDeadline.landlordEmailAction'),
        `/deposit/${deposit.applicationId}`,
      ).catch(console.error);

      // Notify tenant
      if (tenantId) {
        await createNotification({
          userId: tenantId,
          type: 'deposit',
          title: t('deposit.preDeadline.tenantNotifTitle'),
          message: t('deposit.preDeadline.tenantNotifMessage'),
          link: `/deposit/${deposit.applicationId}`,
        });

        sendPushNotification({
          userId: tenantId,
          title: t('deposit.preDeadline.tenantPushTitle'),
          body: t('deposit.preDeadline.tenantPushBody'),
          url: `/deposit/${deposit.applicationId}`,
        });

        DepositService.sendDepositEmail(
          tenantId,
          t('deposit.preDeadline.tenantEmailSubject'),
          t('deposit.preDeadline.tenantEmailHeading'),
          t('deposit.preDeadline.tenantEmailBody'),
          t('deposit.preDeadline.tenantEmailAction'),
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

    const t = getServerTranslation('emails');

    for (const deposit of deposits) {
      const landlordId = deposit.application.listing.rentalUnit.property.ownerId;
      const tenantId = deposit.application.candidateScope?.creatorUserId;
      const penaltyDisplay = (deposit.penaltyAmountCents / 100).toFixed(2);
      const penaltyDisplayRounded = (deposit.penaltyAmountCents / 100).toFixed(0);

      await prisma.depositEvent.create({
        data: {
          depositId: deposit.id,
          type: 'SECOND_REMINDER',
          description: t('deposit.postDeadline.eventDescription'),
          actorType: 'cron',
        },
      });

      // Strong reminder to landlord
      await createNotification({
        userId: landlordId,
        type: 'deposit',
        title: t('deposit.postDeadline.landlordNotifTitle'),
        message: t('deposit.postDeadline.landlordNotifMessage', { penalty: penaltyDisplay }),
        link: `/deposit/${deposit.applicationId}`,
      });

      sendPushNotification({
        userId: landlordId,
        title: t('deposit.postDeadline.landlordPushTitle'),
        body: t('deposit.postDeadline.landlordPushBody', { penalty: penaltyDisplay }),
        url: `/deposit/${deposit.applicationId}`,
      });

      DepositService.sendDepositEmail(
        landlordId,
        t('deposit.postDeadline.landlordEmailSubject'),
        t('deposit.postDeadline.landlordEmailHeading'),
        t('deposit.postDeadline.landlordEmailBody', { penalty: penaltyDisplayRounded }),
        t('deposit.postDeadline.landlordEmailAction'),
        `/deposit/${deposit.applicationId}`,
      ).catch(console.error);

      // Suggest formal notice to tenant
      if (tenantId) {
        await createNotification({
          userId: tenantId,
          type: 'deposit',
          title: t('deposit.postDeadline.tenantNotifTitle'),
          message: t('deposit.postDeadline.tenantNotifMessage'),
          link: `/deposit/${deposit.applicationId}`,
        });

        sendPushNotification({
          userId: tenantId,
          title: t('deposit.postDeadline.tenantPushTitle'),
          body: t('deposit.postDeadline.tenantPushBody'),
          url: `/deposit/${deposit.applicationId}`,
        });

        DepositService.sendDepositEmail(
          tenantId,
          t('deposit.postDeadline.tenantEmailSubject'),
          t('deposit.postDeadline.tenantEmailHeading'),
          t('deposit.postDeadline.tenantEmailBody'),
          t('deposit.postDeadline.tenantEmailAction'),
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
    const t = getServerTranslation('emails');
    await prisma.securityDeposit.update({
      where: { id: depositId },
      data: { formalNoticeSentAt: sentDate },
    });

    await prisma.depositEvent.create({
      data: {
        depositId,
        type: 'FORMAL_NOTICE_SENT',
        description: t('deposit.events.formalNoticeSent', { date: sentDate.toLocaleDateString('fr-FR') }),
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
    const t = getServerTranslation('emails');
    const amount = (deposit.amountCents / 100).toFixed(2);
    const descriptions: Partial<Record<DepositEventType, string>> = {
      LEASE_SIGNED: t('deposit.events.leaseSigned', { amount }),
      PAYMENT_DETECTED: t('deposit.events.paymentDetected'),
      PAYMENT_CONFIRMED: t('deposit.events.paymentConfirmed', { amount }),
      ENTRY_INSPECTION_DONE: t('deposit.events.entryInspectionDone'),
      EXIT_INSPECTION_STARTED: t('deposit.events.exitInspectionStarted'),
      EXIT_INSPECTION_SIGNED: t('deposit.events.exitInspectionSigned'),
      RETENTIONS_PROPOSED: t('deposit.events.retentionsProposed'),
      TENANT_AGREED: t('deposit.events.tenantAgreed'),
      TENANT_PARTIAL_AGREED: t('deposit.events.tenantPartialAgreed'),
      TENANT_DISPUTED: t('deposit.events.tenantDisputed'),
      PARTIAL_RELEASE: t('deposit.events.partialRelease'),
      FULL_RELEASE: t('deposit.events.fullRelease'),
      DEADLINE_WARNING: t('deposit.events.deadlineWarning'),
      DEADLINE_OVERDUE: t('deposit.events.deadlineOverdue'),
      PENALTY_UPDATED: t('deposit.events.penaltyUpdated'),
      FORMAL_NOTICE_GENERATED: t('deposit.events.formalNoticeGenerated'),
      FORMAL_NOTICE_SENT: t('deposit.events.formalNoticeSentDefault'),
      CDC_DOSSIER_GENERATED: t('deposit.events.cdcDossierGenerated'),
      TIMELINE_EXPORTED: t('deposit.events.timelineExported'),
      RESOLVED: t('deposit.events.resolved'),
      SECOND_REMINDER: t('deposit.events.secondReminder'),
      DEDUCTION_EXCEEDS_DEPOSIT: t('deposit.events.deductionExceedsDeposit'),
    };
    return descriptions[event] || t('deposit.events.default', { event });
  }
}
