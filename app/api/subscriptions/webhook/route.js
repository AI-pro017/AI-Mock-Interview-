import { NextResponse } from 'next/server';
import { stripe } from '@/utils/stripe';
import { SubscriptionService } from '@/utils/subscriptionService';
import { db } from '@/utils/db';
import { subscriptionPlans, userSubscriptions } from '@/utils/schema';
import { eq, and } from 'drizzle-orm';

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
  const userId = session.metadata.userId;
  const planName = session.metadata.planName;

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

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(session.subscription);

  // Create new subscription record (preserving history)
  await SubscriptionService.createOrUpdateUserSubscription(userId, plan[0].id, {
    customerId: session.customer,
    subscriptionId: session.subscription,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  });

  console.log('✅ New subscription created for user:', userId, 'plan:', planName);
}

async function handleSubscriptionUpdated(subscription) {
  // For subscription updates, we still update the current record
  // This handles status changes, period updates, etc. for the same plan
  await db
    .update(userSubscriptions)
    .set({
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(and(
      eq(userSubscriptions.stripeSubscriptionId, subscription.id),
      eq(userSubscriptions.status, 'active')
    ));

  console.log('✅ Subscription updated:', subscription.id);
}

async function handleSubscriptionDeleted(subscription) {
  // Mark subscription as canceled
  await db
    .update(userSubscriptions)
    .set({
      status: 'canceled',
      updatedAt: new Date(),
    })
    .where(eq(userSubscriptions.stripeSubscriptionId, subscription.id));

  console.log('✅ Subscription cancelled:', subscription.id);
}

async function handlePaymentSucceeded(invoice) {
  // Update subscription status if needed
  if (invoice.subscription) {
    await db
      .update(userSubscriptions)
      .set({
        status: 'active',
        updatedAt: new Date(),
      })
      .where(and(
        eq(userSubscriptions.stripeSubscriptionId, invoice.subscription),
        eq(userSubscriptions.status, 'active')
      ));

    console.log('✅ Payment succeeded for subscription:', invoice.subscription);
  }
}

async function handlePaymentFailed(invoice) {
  // Update subscription status to past_due
  if (invoice.subscription) {
    await db
      .update(userSubscriptions)
      .set({
        status: 'past_due',
        updatedAt: new Date(),
      })
      .where(and(
        eq(userSubscriptions.stripeSubscriptionId, invoice.subscription),
        eq(userSubscriptions.status, 'active')
      ));

    console.log('⚠️ Payment failed for subscription:', invoice.subscription);
  }
} 