import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { neon } from '@neondatabase/serverless';

export async function POST(request, { params }) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = neon(process.env.NEXT_PUBLIC_DRIZZLE_DB_URL);
    
    // Check admin authorization
    const adminUser = await sql`
      SELECT * FROM admin_users WHERE user_id = ${session.user.id} AND is_active = true
    `;

    if (adminUser.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = params.userId;
    const { planId } = await request.json();

    console.log('🔄 Changing plan for user:', userId, 'to plan:', planId);

    // Verify the plan exists
    const plan = await sql`
      SELECT * FROM subscription_plans WHERE id = ${planId} AND is_active = true
    `;

    if (plan.length === 0) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Check if user exists
    const user = await sql`
      SELECT * FROM users WHERE id = ${userId}
    `;

    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get current subscription for history tracking
    const currentSubscription = await sql`
      SELECT us.*, sp.name as plan_name, sp.display_name as plan_display_name, sp.price
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ${userId} AND us.status = 'active'
      ORDER BY us.created_at DESC
      LIMIT 1
    `;

    // Mark current subscription as cancelled (preserve history)
    await sql`
      UPDATE user_subscriptions 
      SET status = 'cancelled', updated_at = NOW()
      WHERE user_id = ${userId} AND status = 'active'
    `;

    // Always create new subscription record (even for freemium)
    const newSubscription = await sql`
      INSERT INTO user_subscriptions (user_id, plan_id, status, created_at, updated_at)
      VALUES (${userId}, ${planId}, 'active', NOW(), NOW())
      RETURNING id
    `;

    // Log admin action with detailed history
    await sql`
      INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, details)
      VALUES (
        ${adminUser[0].id}, 
        'plan_changed', 
        'user', 
        ${userId}, 
        ${JSON.stringify({
          previousPlan: currentSubscription[0] ? {
            id: currentSubscription[0].plan_id,
            name: currentSubscription[0].plan_name,
            displayName: currentSubscription[0].plan_display_name,
            price: currentSubscription[0].price
          } : null,
          newPlan: {
            id: planId,
            name: plan[0].name,
            displayName: plan[0].display_name,
            price: plan[0].price
          },
          subscriptionId: newSubscription[0].id,
          reason: 'Plan changed by admin'
        })}
      )
    `;

    console.log('✅ Plan changed successfully - New subscription record created');

    return NextResponse.json({ 
      success: true, 
      message: `Plan changed to ${plan[0].display_name}`,
      subscriptionId: newSubscription[0].id
    });

  } catch (error) {
    console.error('Plan change error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 