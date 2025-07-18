import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/utils/db';
import { subscriptionPlans } from '@/utils/schema';
import { eq } from 'drizzle-orm';
import { createCheckoutSession } from '@/utils/stripe';

export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planName } = await req.json();

    if (!planName) {
      return NextResponse.json({ error: 'Plan name is required' }, { status: 400 });
    }

    // Get plan details
    const plan = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.name, planName))
      .limit(1);

    if (!plan[0]) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    if (!plan[0].stripePriceId) {
      return NextResponse.json({ error: 'Plan not configured for payments' }, { status: 400 });
    }

    // Create Stripe checkout session
    const checkoutSession = await createCheckoutSession(
      session.user.id,
      plan[0].stripePriceId,
      planName
    );

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
