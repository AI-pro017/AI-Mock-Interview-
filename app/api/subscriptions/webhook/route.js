import { NextResponse } from 'next/server';
import { stripe } from '@/utils/stripe';
import { SubscriptionService } from '@/utils/subscriptionService';
import { db } from '@/utils/db';
import { subscriptionPlans, userSubscriptions } from '@/utils/schema';
import { eq } from 'drizzle-orm';

export async function POST(req) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('Webhook received:', event.type, event.id);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session) {
  console.log('Processing checkout completed:', session.id);
  
  const userId = session.metadata.userId;
  const planName = session.metadata.planName;

  if (!userId || !planName) {
    console.error('Missing metadata in checkout session:', { userId, planName });
    return;
  }

  console.log('User ID:', userId, 'Plan Name:', planName);

  // Get plan details
  const plan = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.name, planName))
    .limit(1);

  if (!plan[0]) {
    console.error('Plan not found:', planName);
    return;
  }

  console.log('Plan found:', plan[0]);

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(session.subscription);
  console.log('Stripe subscription:', subscription.id, subscription.status);

  // Create or update subscription in database
  const success = await SubscriptionService.createOrUpdateSubscription(userId, plan[0].id, {
    customerId: session.customer,
    subscriptionId: session.subscription,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  });

  if (success) {
    console.log('Subscription created/updated successfully for user:', userId);
  } else {
    console.error('Failed to create/update subscription for user:', userId);
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log('Processing subscription updated:', subscription.id);
  
  // Update subscription status in database
  const result = await db
    .update(userSubscriptions)
    .set({
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(eq(userSubscriptions.stripeSubscriptionId, subscription.id));

  console.log('Subscription updated in database:', result);
}

async function handleSubscriptionDeleted(subscription) {
  console.log('Processing subscription deleted:', subscription.id);
  
  // Update subscription status to canceled
  await db
    .update(userSubscriptions)
    .set({
      status: 'canceled',
      updatedAt: new Date(),
    })
    .where(eq(userSubscriptions.stripeSubscriptionId, subscription.id));
}

async function handlePaymentSucceeded(invoice) {
  console.log('Processing payment succeeded:', invoice.id);
  
  // Update subscription status if needed
  if (invoice.subscription) {
    await db
      .update(userSubscriptions)
      .set({
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.stripeSubscriptionId, invoice.subscription));
  }
}

async function handlePaymentFailed(invoice) {
  console.log('Processing payment failed:', invoice.id);
  
  // Update subscription status to past_due
  if (invoice.subscription) {
    await db
      .update(userSubscriptions)
      .set({
        status: 'past_due',
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.stripeSubscriptionId, invoice.subscription));
  }
} 