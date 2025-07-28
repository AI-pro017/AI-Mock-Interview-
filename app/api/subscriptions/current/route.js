import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { SubscriptionService } from '@/utils/subscriptionService';
import { requireActiveUser } from '@/utils/auth-helpers';

// Add this line to fix the dynamic server usage error
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 🔒 Add disabled user check
    const userCheck = await requireActiveUser();
    if (userCheck.error) {
      return NextResponse.json(
        { error: userCheck.message }, 
        { status: userCheck.status }
      );
    }

    const session = await auth();
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

