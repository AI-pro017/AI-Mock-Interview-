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

    // End current subscription if exists
    await sql`
      UPDATE user_subscriptions 
      SET status = 'cancelled', updated_at = NOW()
      WHERE user_id = ${userId} AND status = 'active'
    `;

    // Create new subscription (only if not freemium)
    if (plan[0].name !== 'freemium') {
      await sql`
        INSERT INTO user_subscriptions (user_id, plan_id, status, created_at, updated_at)
        VALUES (${userId}, ${planId}, 'active', NOW(), NOW())
      `;
    }

    // Log admin action
    await sql`
      INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, details)
      VALUES (
        ${adminUser[0].id}, 
        'plan_changed', 
        'user', 
        ${userId}, 
        ${JSON.stringify({
          newPlanId: planId,
          newPlanName: plan[0].name,
          reason: 'Plan changed by admin'
        })}
      )
    `;

    console.log('✅ Plan changed successfully');

    return NextResponse.json({ 
      success: true, 
      message: `Plan changed to ${plan[0].display_name}` 
    });

  } catch (error) {
    console.error('Plan change error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 