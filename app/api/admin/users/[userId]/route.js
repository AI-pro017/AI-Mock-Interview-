import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { neon } from '@neondatabase/serverless';

// Get individual user details
export async function GET(request, { params }) {
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

    // Get user details with subscription info INCLUDING disabled status
    const userDetails = await sql`
      SELECT 
        u.id,
        u.name,
        u.email,
        u."emailVerified",
        u.image,
        u."experienceLevel",
        u."targetRoles",
        COALESCE(u.disabled, false) as disabled,
        sp.name as "planName",
        sp.display_name as "planDisplayName",
        sp.price as "planPrice",
        sp.mock_sessions_limit as "mockSessionsLimit",
        sp.real_time_help_limit as "realTimeSessionsLimit",
        us.status as "subscriptionStatus",
        us.created_at as "subscriptionCreatedAt"
      FROM users u
      LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
      LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE u.id = ${userId}
      LIMIT 1
    `;

    if (userDetails.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userDetails[0];

    // Get usage data for current month
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usageData = await sql`
      SELECT 
        session_type as "sessionType",
        COUNT(*) as "totalSessions",
        SUM(COALESCE(duration, 0)) as "totalDuration"
      FROM usage_tracking
      WHERE user_id = ${userId} 
        AND billing_month = ${currentMonth}
      GROUP BY session_type
    `;

    const mockUsage = usageData.find(u => u.sessionType === 'mock_interview');
    const rtUsage = usageData.find(u => u.sessionType === 'real_time_help');

    // Get available credits
    const availableCredits = await sql`
      SELECT 
        session_type as "sessionType",
        SUM(credits_granted) as "totalCredits"
      FROM session_credits
      WHERE user_id = ${userId} 
        AND is_used = false
        AND (expires_at IS NULL OR expires_at > NOW())
      GROUP BY session_type
    `;

    const mockCredits = availableCredits.find(c => c.sessionType === 'mock_interview');
    const rtCredits = availableCredits.find(c => c.sessionType === 'real_time_help');

    // Set default plan if no subscription
    const result = {
      ...user,
      planName: user.planName || 'freemium',
      planDisplayName: user.planDisplayName || 'Freemium',
      mockSessionsLimit: user.mockSessionsLimit || 2,
      realTimeSessionsLimit: user.realTimeSessionsLimit || 2,
      mockSessionsUsed: parseInt(mockUsage?.totalSessions || 0),
      realTimeSessionsUsed: parseInt(rtUsage?.totalSessions || 0),
      mockDurationUsed: parseInt(mockUsage?.totalDuration || 0),
      realTimeDurationUsed: parseInt(rtUsage?.totalDuration || 0),
      mockCreditsAvailable: parseInt(mockCredits?.totalCredits || 0),
      realTimeCreditsAvailable: parseInt(rtCredits?.totalCredits || 0),
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('User details fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update user details
export async function PUT(request, { params }) {
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
    const updateData = await request.json();

    // Update user information
    await sql`
      UPDATE users 
      SET 
        name = ${updateData.name || null},
        "experienceLevel" = ${updateData.experienceLevel || null},
        "targetRoles" = ${updateData.targetRoles || null}
      WHERE id = ${userId}
    `;

    // Log admin action
    await sql`
      INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, details)
      VALUES (
        ${adminUser[0].id}, 
        'user_updated', 
        'user', 
        ${userId}, 
        ${JSON.stringify(updateData)}
      )
    `;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('User update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 