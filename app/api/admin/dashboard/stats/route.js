import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { neon } from '@neondatabase/serverless';

export async function GET() {
  try {
    console.log('🔍 Dashboard stats API called');
    
    const session = await auth();
    
    if (!session?.user?.id) {
      console.log('❌ No session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Session found:', session.user.email);

    // Check admin authorization
    const sql = neon(process.env.NEXT_PUBLIC_DRIZZLE_DB_URL);
    
    const adminUser = await sql`
      SELECT * FROM admin_users WHERE user_id = ${session.user.id} AND is_active = true
    `;

    if (adminUser.length === 0) {
      console.log('❌ User is not admin');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('✅ Admin user verified');

    // Get current date ranges
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    console.log('📅 Date ranges:', {
      firstDayThisMonth: firstDayThisMonth.toISOString(),
      today: today.toISOString()
    });

    // Query each stat individually with error handling
    let totalUsers = 0;
    let newUsersThisMonth = 0;
    let activeSessions = 0;
    let sessionsToday = 0;
    let monthlyRevenue = 0;
    let conversionRate = 0;

    try {
      // Total users
      const totalUsersResult = await sql`SELECT COUNT(*) as count FROM users`;
      totalUsers = parseInt(totalUsersResult[0]?.count || 0);
      console.log('👥 Total users:', totalUsers);
    } catch (error) {
      console.error('Error fetching total users:', error);
    }

    try {
      // New users this month (using correct column name)
      const newUsersResult = await sql`
        SELECT COUNT(*) as count FROM users 
        WHERE "emailVerified" IS NOT NULL 
        AND "emailVerified" >= ${firstDayThisMonth.toISOString()}
      `;
      newUsersThisMonth = parseInt(newUsersResult[0]?.count || 0);
      console.log('📈 New users this month:', newUsersThisMonth);
    } catch (error) {
      console.error('Error fetching new users:', error);
    }

    try {
      // Active sessions (mock interviews in last 24 hours) - using correct table name
      const activeSessionsResult = await sql`
        SELECT COUNT(*) as count FROM "mockInterview" 
        WHERE "createdAt" >= ${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}
      `;
      activeSessions = parseInt(activeSessionsResult[0]?.count || 0);
      console.log('🎤 Active sessions:', activeSessions);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
    }

    try {
      // Sessions today
      const sessionsTodayResult = await sql`
        SELECT COUNT(*) as count FROM usage_tracking 
        WHERE used_at >= ${today.toISOString()}
      `;
      sessionsToday = parseInt(sessionsTodayResult[0]?.count || 0);
      console.log('📊 Sessions today:', sessionsToday);
    } catch (error) {
      console.error('Error fetching sessions today:', error);
    }

    try {
      // Subscription data for revenue calculation
      const subscriptionData = await sql`
        SELECT sp.price, COUNT(us.id) as user_count
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.status = 'active'
        GROUP BY sp.price, sp.name
      `;
      
      monthlyRevenue = subscriptionData.reduce((total, item) => {
        return total + (parseFloat(item.price) * parseInt(item.user_count));
      }, 0);
      console.log('💰 Monthly revenue:', monthlyRevenue, 'from', subscriptionData.length, 'plans');
    } catch (error) {
      console.error('Error fetching revenue:', error);
    }

    try {
      // Calculate conversion rate
      const paidUsersResult = await sql`
        SELECT COUNT(*) as count
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.status = 'active' AND sp.name != 'freemium'
      `;
      
      const paidUsers = parseInt(paidUsersResult[0]?.count || 0);
      conversionRate = totalUsers > 0 ? ((paidUsers / totalUsers) * 100).toFixed(1) : 0;
      console.log('📊 Conversion rate:', conversionRate, `(${paidUsers}/${totalUsers})`);
    } catch (error) {
      console.error('Error fetching conversion rate:', error);
    }

    const stats = {
      totalUsers,
      newUsersThisMonth,
      activeSessions,
      sessionsToday,
      monthlyRevenue: Math.round(monthlyRevenue),
      revenueGrowth: 15, // Placeholder
      conversionRate: parseFloat(conversionRate)
    };

    console.log('✅ Final stats:', stats);

    return NextResponse.json(stats);

  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      debug: error.message 
    }, { status: 500 });
  }
} 