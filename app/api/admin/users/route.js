import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { neon } from '@neondatabase/serverless';

export async function GET(request) {
  try {
    console.log('🔍 Users API called');
    
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin authorization
    const sql = neon(process.env.NEXT_PUBLIC_DRIZZLE_DB_URL);
    
    const adminUser = await sql`
      SELECT * FROM admin_users WHERE user_id = ${session.user.id} AND is_active = true
    `;

    if (adminUser.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('✅ Admin verified, fetching users...');

    // Get URL parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = (page - 1) * limit;

    // Fetch users with correct column names including disabled status
    let usersData = [];
    
    try {
      // Get basic user data with correct column names
      usersData = await sql`
        SELECT 
          u.id,
          u.name,
          u.email,
          u."emailVerified",
          u.image,
          u."experienceLevel",
          u."targetRoles",
          COALESCE(u.disabled, false) as disabled
        FROM users u
        ORDER BY u."emailVerified" DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `;

      console.log(`📋 Found ${usersData.length} users`);

      // Get subscription data for each user
      const usersWithSubscriptions = await Promise.all(
        usersData.map(async (user) => {
          try {
            // Get subscription info
            const subscriptionInfo = await sql`
              SELECT 
                sp.id as "planId",
                sp.name as "planName",
                sp.display_name as "planDisplayName",
                sp.price as "planPrice",
                sp.mock_sessions_limit as "mockSessionsLimit",
                sp.real_time_help_limit as "realTimeSessionsLimit",
                us.status as "subscriptionStatus",
                us.created_at as "subscriptionCreatedAt"
              FROM user_subscriptions us
              JOIN subscription_plans sp ON us.plan_id = sp.id
              WHERE us.user_id = ${user.id} AND us.status = 'active'
              LIMIT 1
            `;

            // Get usage data for current month
            const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
            const usageData = await sql`
              SELECT 
                session_type as "sessionType",
                COUNT(*) as "totalSessions",
                SUM(COALESCE(duration, 0)) as "totalDuration"
              FROM usage_tracking
              WHERE user_id = ${user.id} 
                AND billing_month = ${currentMonth}
              GROUP BY session_type
            `;

            const mockUsage = usageData.find(u => u.sessionType === 'mock_interview');
            const rtUsage = usageData.find(u => u.sessionType === 'real_time_help');

            // Default to freemium if no subscription
            const subscription = subscriptionInfo[0] || {
              planId: null,
              planName: 'freemium',
              planDisplayName: 'Freemium',
              planPrice: 0,
              mockSessionsLimit: 2,
              realTimeSessionsLimit: 2,
              subscriptionStatus: 'active',
              subscriptionCreatedAt: null
            };

            return {
              ...user,
              ...subscription,
              mockSessionsUsed: parseInt(mockUsage?.totalSessions || 0),
              realTimeSessionsUsed: parseInt(rtUsage?.totalSessions || 0),
              mockDurationUsed: parseInt(mockUsage?.totalDuration || 0),
              realTimeDurationUsed: parseInt(rtUsage?.totalDuration || 0),
            };
          } catch (userError) {
            console.error(`Error processing user ${user.id}:`, userError);
            return {
              ...user,
              planName: 'freemium',
              planDisplayName: 'Freemium',
              mockSessionsUsed: 0,
              realTimeSessionsUsed: 0
            };
          }
        })
      );

      console.log(`✅ Processed ${usersWithSubscriptions.length} users with subscription data`);

      return NextResponse.json(usersWithSubscriptions);

    } catch (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json([]);
    }

  } catch (error) {
    console.error('Admin users fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}