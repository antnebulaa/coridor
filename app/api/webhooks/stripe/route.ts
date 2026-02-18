import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { SubscriptionService } from '@/services/SubscriptionService';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature || !STRIPE_WEBHOOK_SECRET) {
      console.warn('[Stripe Webhook] Missing signature or secret');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error('[Stripe Webhook] Signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('[Stripe Webhook] Received:', event.type);

    switch (event.type) {
      case 'checkout.session.completed':
        await SubscriptionService.handleCheckoutCompleted(event.data.object);
        break;

      case 'invoice.paid':
        await SubscriptionService.handleInvoicePaid(event.data.object);
        break;

      case 'customer.subscription.updated':
        await SubscriptionService.handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await SubscriptionService.handleSubscriptionDeleted(event.data.object);
        break;

      default:
        console.log('[Stripe Webhook] Unhandled event:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Stripe Webhook] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
