import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { SubscriptionService } from '@/utils/subscriptionService';
import { cancelSubscription } from '@/utils/stripe';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await SubscriptionService.getUserSubscription(session.user.id);
    if (!subscription || !subscription.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    // Cancel subscription in Stripe
    await cancelSubscription(subscription.stripeSubscriptionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
