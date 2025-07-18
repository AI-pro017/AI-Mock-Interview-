import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { SubscriptionService } from '@/utils/subscriptionService';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await SubscriptionService.getUserSubscription(session.user.id);
    const usage = subscription ? await SubscriptionService.getUserUsage(session.user.id, subscription.id) : null;

    return NextResponse.json({
      subscription,
      usage,
    });
  } catch (error) {
    console.error('Error fetching current subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

