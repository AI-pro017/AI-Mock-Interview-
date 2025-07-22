import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { neon } from '@neondatabase/serverless';

export async function GET(request) {
  try {
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

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';

    // Calculate date range
    let dateFilter = new Date();
    switch (range) {
      case '7d':
        dateFilter.setDate(dateFilter.getDate() - 7);
        break;
      case '90d':
        dateFilter.setDate(dateFilter.getDate() - 90);
        break;
      case '1y':
        dateFilter.setFullYear(dateFilter.getFullYear() - 1);
        break;
      default: // 30d
        dateFilter.setDate(dateFilter.getDate() - 30);
    }

    // Get subscription overview
    const [revenueData, subscriberData, conversionData] = await Promise.all([
      // Revenue data
      sql`
        SELECT 
          SUM(sp.price * 1) as "monthlyRevenue"
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.status = 'active' AND us.created_at >= ${dateFilter.toISOString()}
      `,
      
      // Subscriber data
      sql`
        SELECT COUNT(*) as "paidSubscribers"
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.status = 'active' AND sp.name != 'freemium'
      `,
      
      // Conversion data
      sql`
        SELECT 
          (SELECT COUNT(*) FROM users) as "totalUsers",
          (SELECT COUNT(*) FROM user_subscriptions us 
           JOIN subscription_plans sp ON us.plan_id = sp.id 
           WHERE us.status = 'active' AND sp.name != 'freemium') as "paidUsers"
      `
    ]);

    // Plan distribution
    const planDistribution = await sql`
      SELECT 
        COALESCE(sp.name, 'freemium') as name,
        COALESCE(sp.display_name, 'Freemium') as "displayName",
        COALESCE(sp.price, 0) as price,
        COUNT(CASE WHEN us.status = 'active' THEN 1 ELSE NULL END) as "userCount",
        SUM(CASE WHEN us.status = 'active' THEN sp.price ELSE 0 END) as "monthlyRevenue"
      FROM subscription_plans sp
      LEFT JOIN user_subscriptions us ON sp.id = us.plan_id
      GROUP BY sp.id, sp.name, sp.display_name, sp.price
      
      UNION ALL
      
      SELECT 
        'freemium' as name,
        'Freemium' as "displayName", 
        0 as price,
        (SELECT COUNT(*) FROM users u 
         WHERE NOT EXISTS (
           SELECT 1 FROM user_subscriptions us2 
           WHERE us2.user_id = u.id AND us2.status = 'active'
         )) as "userCount",
        0 as "monthlyRevenue"
      
      ORDER BY price DESC
    `;

    // Add percentage calculation
    const totalUsers = planDistribution.reduce((sum, plan) => sum + parseInt(plan.userCount), 0);
    const planDistributionWithPercentage = planDistribution.map(plan => ({
      ...plan,
      userCount: parseInt(plan.userCount),
      monthlyRevenue: parseFloat(plan.monthlyRevenue || 0),
      percentage: totalUsers > 0 ? ((parseInt(plan.userCount) / totalUsers) * 100).toFixed(1) : 0
    }));

    // Recent subscription changes
    const recentChanges = await sql`
      SELECT 
        u.email as "userEmail",
        'upgrade' as type,
        'freemium' as "fromPlan",
        sp.display_name as "toPlan",
        sp.price as "revenueImpact",
        us.created_at as date
      FROM user_subscriptions us
      JOIN users u ON us.user_id = u.id
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.created_at >= ${dateFilter.toISOString()}
      ORDER BY us.created_at DESC
      LIMIT 10
    `;

    const overview = {
      monthlyRevenue: parseFloat(revenueData[0]?.monthlyRevenue || 0),
      revenueGrowth: 15, // Mock data - implement actual calculation
      paidSubscribers: parseInt(subscriberData[0]?.paidSubscribers || 0),
      subscriberGrowth: 10, // Mock data - implement actual calculation
      conversionRate: conversionData[0] ? 
        ((parseInt(conversionData[0].paidUsers) / parseInt(conversionData[0].totalUsers)) * 100).toFixed(1) : 0,
      arpu: subscriberData[0]?.paidSubscribers > 0 ? 
        (parseFloat(revenueData[0]?.monthlyRevenue || 0) / parseInt(subscriberData[0]?.paidSubscribers)).toFixed(2) : 0
    };

    return NextResponse.json({
      overview,
      planDistribution: planDistributionWithPercentage,
      revenueData: recentChanges
    });

  } catch (error) {
    console.error('Subscription analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 