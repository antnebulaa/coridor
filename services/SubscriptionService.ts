import { stripe } from '@/lib/stripe';
import prisma from '@/libs/prismadb';

export class SubscriptionService {

  /**
   * Create a Stripe Checkout session for a subscription.
   */
  static async createCheckoutSession(params: {
    userId: string;
    userEmail: string;
    planId: string;
    billingCycle: 'MONTHLY' | 'YEARLY';
    successUrl: string;
    cancelUrl: string;
  }): Promise<string> {
    const { userId, userEmail, planId, billingCycle, successUrl, cancelUrl } = params;

    // Get the plan
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error('Plan not found');

    const priceId = billingCycle === 'YEARLY' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;
    if (!priceId) throw new Error(`No Stripe price configured for ${plan.name} ${billingCycle}`);

    // Get or create Stripe customer
    let stripeCustomerId = (await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    }))?.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId },
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId, planId, billingCycle },
      subscription_data: {
        metadata: { userId, planId, billingCycle },
      },
    });

    if (!session.url) throw new Error('Failed to create checkout session');
    return session.url;
  }

  /**
   * Create a Stripe Billing Portal session.
   */
  static async createPortalSession(userId: string, returnUrl: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      throw new Error('No Stripe customer found for this user');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl,
    });

    return session.url;
  }

  /**
   * Handle Stripe webhook: checkout.session.completed
   */
  static async handleCheckoutCompleted(session: any): Promise<void> {
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;
    const billingCycle = session.metadata?.billingCycle || 'MONTHLY';
    const stripeSubscriptionId = session.subscription;
    const stripeCustomerId = session.customer;

    if (!userId || !planId) {
      console.error('[Stripe Webhook] Missing userId or planId in session metadata');
      return;
    }

    // Ensure stripeCustomerId is saved
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: stripeCustomerId as string },
    });

    // Fetch Stripe subscription for period dates
    const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId as string);

    // Deactivate any existing subscription
    await prisma.userSubscription.updateMany({
      where: { userId, status: { in: ['ACTIVE', 'TRIALING'] } },
      data: { status: 'CANCELLED' },
    });

    // Create new subscription
    await prisma.userSubscription.create({
      data: {
        userId,
        planId,
        stripeCustomerId: stripeCustomerId as string,
        stripeSubscriptionId: stripeSubscriptionId as string,
        status: 'ACTIVE',
        billingCycle,
        currentPeriodStart: stripeSub.items.data[0]?.current_period_start
          ? new Date(stripeSub.items.data[0].current_period_start * 1000)
          : new Date(),
        currentPeriodEnd: stripeSub.items.data[0]?.current_period_end
          ? new Date(stripeSub.items.data[0].current_period_end * 1000)
          : undefined,
      },
    });

    // Update legacy plan field for backward compatibility
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (plan) {
      const legacyPlanMap: Record<string, string> = { FREE: 'FREE', ESSENTIAL: 'PLUS', PRO: 'PRO' };
      const legacyPlan = legacyPlanMap[plan.name] || 'FREE';
      await prisma.user.update({
        where: { id: userId },
        data: { plan: legacyPlan as any },
      });
    }

    console.log(`[Stripe] Subscription created for user ${userId}, plan ${planId}`);
  }

  /**
   * Handle Stripe webhook: invoice.paid
   */
  static async handleInvoicePaid(invoice: any): Promise<void> {
    const stripeSubscriptionId = invoice.subscription;
    if (!stripeSubscriptionId) return;

    const userSub = await prisma.userSubscription.findFirst({
      where: { stripeSubscriptionId },
    });

    if (!userSub) return;

    // Create invoice record
    await prisma.invoice.create({
      data: {
        userId: userSub.userId,
        subscriptionId: null, // legacy subscription ID, not used
        amountCents: invoice.amount_paid,
        description: `Abonnement Coridor — ${invoice.lines?.data?.[0]?.description || 'Paiement'}`,
        status: 'PAID',
        invoiceDate: new Date(invoice.created * 1000),
        pdfUrl: invoice.hosted_invoice_url || null,
      },
    });
  }

  /**
   * Handle Stripe webhook: customer.subscription.updated
   */
  static async handleSubscriptionUpdated(subscription: any): Promise<void> {
    const stripeSubscriptionId = subscription.id;
    
    const userSub = await prisma.userSubscription.findFirst({
      where: { stripeSubscriptionId },
    });

    if (!userSub) return;

    const statusMap: Record<string, string> = {
      active: 'ACTIVE',
      past_due: 'PAST_DUE',
      canceled: 'CANCELLED',
      trialing: 'TRIALING',
      unpaid: 'PAST_DUE',
    };

    await prisma.userSubscription.update({
      where: { id: userSub.id },
      data: {
        status: statusMap[subscription.status] || 'ACTIVE',
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
  }

  /**
   * Handle Stripe webhook: customer.subscription.deleted
   */
  static async handleSubscriptionDeleted(subscription: any): Promise<void> {
    const stripeSubscriptionId = subscription.id;

    const userSub = await prisma.userSubscription.findFirst({
      where: { stripeSubscriptionId },
      include: { user: true },
    });

    if (!userSub) return;

    await prisma.userSubscription.update({
      where: { id: userSub.id },
      data: { status: 'CANCELLED' },
    });

    // Revert to FREE plan (legacy)
    await prisma.user.update({
      where: { id: userSub.userId },
      data: { plan: 'FREE' },
    });

    console.log(`[Stripe] Subscription cancelled for user ${userSub.userId}`);
  }
}
