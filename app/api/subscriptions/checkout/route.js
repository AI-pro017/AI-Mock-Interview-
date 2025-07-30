import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/utils/db';
import { subscriptionPlans } from '@/utils/schema';
import { eq } from 'drizzle-orm';
import { createCheckoutSession } from '@/utils/stripe';

export async function POST(req) {
  const debugInfo = [];
  
  try {
    debugInfo.push('Starting checkout session creation...');
    
    // Check authentication
    let session;
    try {
      session = await auth();
      debugInfo.push(session ? 'Auth session: Found' : 'Auth session: Not found');
    } catch (authError) {
      debugInfo.push(`Auth error: ${authError.message}`);
      return NextResponse.json({ 
        error: 'Authentication failed', 
        debug: debugInfo,
        details: authError.message 
      }, { status: 500 });
    }
    
    if (!session?.user?.id) {
      debugInfo.push('Authentication failed - no user ID');
      return NextResponse.json({ 
        error: 'Unauthorized', 
        debug: debugInfo 
      }, { status: 401 });
    }

    debugInfo.push(`User ID: ${session.user.id}`);

    // Parse request body
    let planName;
    try {
      const body = await req.json();
      planName = body.planName;
      debugInfo.push(`Plan name received: ${planName}`);
    } catch (parseError) {
      debugInfo.push(`Error parsing request body: ${parseError.message}`);
      return NextResponse.json({ 
        error: 'Invalid request body', 
        debug: debugInfo,
        details: parseError.message 
      }, { status: 400 });
    }

    if (!planName) {
      debugInfo.push('Plan name is missing');
      return NextResponse.json({ 
        error: 'Plan name is required', 
        debug: debugInfo 
      }, { status: 400 });
    }

    // Database connection and query
    debugInfo.push(`Querying database for plan: ${planName}`);
    let plan;
    try {
      plan = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.name, planName))
        .limit(1);
      debugInfo.push(`Database query result: ${plan ? `Found ${plan.length} records` : 'No results'}`);
    } catch (dbError) {
      debugInfo.push(`Database error: ${dbError.message}`);
      return NextResponse.json({ 
        error: 'Database connection failed', 
        debug: debugInfo,
        details: dbError.message,
        stack: dbError.stack
      }, { status: 500 });
    }

    if (!plan[0]) {
      debugInfo.push('Plan not found in database');
      return NextResponse.json({ 
        error: 'Plan not found', 
        debug: debugInfo 
      }, { status: 404 });
    }

    debugInfo.push(`Plan found: ${JSON.stringify(plan[0])}`);

    if (!plan[0].stripePriceId) {
      debugInfo.push('Plan missing Stripe price ID');
      return NextResponse.json({ 
        error: 'Plan not configured for payments', 
        debug: debugInfo 
      }, { status: 400 });
    }

    // Create Stripe checkout session
    debugInfo.push('Creating Stripe checkout session...');
    debugInfo.push(`Stripe Price ID: ${plan[0].stripePriceId}`);
    
    let checkoutSession;
    try {
      checkoutSession = await createCheckoutSession(
        session.user.id,
        plan[0].stripePriceId,
        planName
      );
      debugInfo.push('Checkout session created successfully');
      debugInfo.push(`Checkout URL exists: ${!!checkoutSession.url}`);
    } catch (stripeError) {
      debugInfo.push(`Stripe error: ${stripeError.message}`);
      return NextResponse.json({ 
        error: 'Payment processing failed', 
        debug: debugInfo,
        details: stripeError.message,
        stack: stripeError.stack
      }, { status: 500 });
    }

    return NextResponse.json({ 
      url: checkoutSession.url,
      debug: debugInfo // Remove this line in production
    });
    
  } catch (error) {
    debugInfo.push(`Unexpected error: ${error.message}`);
    debugInfo.push(`Error type: ${error.name}`);
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message,
      type: error.name,
      stack: error.stack,
      debug: debugInfo,
      // Additional error details
      cause: error.cause,
      code: error.code
    }, { status: 500 });
  }
}