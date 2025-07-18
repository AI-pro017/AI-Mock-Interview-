import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { stripe } from '@/utils/stripe';
import { SubscriptionService } from '@/utils/subscriptionService';
import { db } from '@/utils/db';
import { subscriptionPlans } from '@/utils/schema';
import { eq } from 'drizzle-orm';

export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = session.user;
    
    // Find customer in Stripe by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
    }

    const customer = customers.data[0];
    
    // Get active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0].price.id;

    // Find the plan by Stripe price ID
    const plan = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.stripePriceId, priceId))
      .limit(1);

    if (!plan[0]) {
      return NextResponse.json({ error: 'Plan not found for this subscription' }, { status: 404 });
    }

    // Create or update subscription in database
    const success = await SubscriptionService.createOrUpdateSubscription(session.user.id, plan[0].id, {
      customerId: customer.id,
      subscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Subscription synced successfully',
        plan: plan[0].displayName 
      });
    } else {
      return NextResponse.json({ error: 'Failed to sync subscription' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error syncing subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 