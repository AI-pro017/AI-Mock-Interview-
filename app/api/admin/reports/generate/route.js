import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { neon } from '@neondatabase/serverless';

export async function POST(request) {
  try {
    console.log('🔍 Reports generate API called');
    
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

    const { reportType, dateRange, format } = await request.json();
    
    console.log('📊 Generating report:', { reportType, dateRange, format });

    // Calculate date filter based on range
    const now = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    let reportData = [];
    let headers = [];
    let filename = `${reportType}-${dateRange}`;

    // Generate report based on type
    switch (reportType) {
      case 'user-activity':
        reportData = await generateUserActivityReport(sql, startDate);
        headers = ['User ID', 'Name', 'Email', 'Registration Date', 'Last Login', 'Total Sessions', 'Plan Type', 'Status'];
        break;
        
      case 'revenue-analysis':
        reportData = await generateRevenueReport(sql, startDate);
        headers = ['Date', 'Plan', 'New Subscriptions', 'Revenue', 'Cumulative Revenue'];
        break;
        
      case 'session-analytics':
        reportData = await generateSessionReport(sql, startDate);
        headers = ['Date', 'Session Type', 'Total Sessions', 'Average Duration', 'Unique Users'];
        break;
        
      case 'conversion-funnel':
        reportData = await generateConversionReport(sql, startDate);
        headers = ['Stage', 'Users', 'Conversion Rate', 'Drop-off Rate'];
        break;
        
      case 'usage-patterns':
        reportData = await generateUsageReport(sql, startDate);
        headers = ['Feature', 'Usage Count', 'Unique Users', 'Average Sessions per User'];
        break;
        
      case 'support-metrics':
        reportData = await generateSupportReport(sql, startDate);
        headers = ['Date', 'Support Notes', 'Credits Granted', 'User Issues'];
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    // Generate response based on format
    let response;
    let contentType;
    
    switch (format) {
      case 'csv':
        response = generateCSV(headers, reportData);
        contentType = 'text/csv';
        filename += '.csv';
        break;
        
      case 'json':
        response = JSON.stringify({
          reportType,
          dateRange,
          generatedAt: new Date().toISOString(),
          headers,
          data: reportData
        }, null, 2);
        contentType = 'application/json';
        filename += '.json';
        break;
        
      case 'xlsx':
        // For now, fall back to CSV format (can be enhanced later with proper Excel library)
        response = generateCSV(headers, reportData);
        contentType = 'text/csv';
        filename += '.csv';
        break;
        
      case 'pdf':
        // For now, fall back to CSV format (can be enhanced later with PDF library)
        response = generateCSV(headers, reportData);
        contentType = 'text/csv';
        filename += '.csv';
        break;
        
      default:
        response = generateCSV(headers, reportData);
        contentType = 'text/csv';
        filename += '.csv';
    }

    console.log('✅ Report generated successfully:', filename);

    return new NextResponse(response, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('❌ Report generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate report',
      details: error.message 
    }, { status: 500 });
  }
}

// Helper function to generate CSV
function generateCSV(headers, data) {
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header] || '';
      // Escape commas and quotes in CSV
      return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
        ? `"${value.replace(/"/g, '""')}"` 
        : value;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
}

// Report generation functions
async function generateUserActivityReport(sql, startDate) {
  try {
    const users = await sql`
      SELECT 
        u.id as "User ID",
        u.name as "Name",
        u.email as "Email",
        u."emailVerified" as "Registration Date",
        au.last_login as "Last Login",
        COALESCE(session_count.total, 0) as "Total Sessions",
        COALESCE(sp.display_name, 'Free') as "Plan Type",
        CASE WHEN u.disabled THEN 'Disabled' ELSE 'Active' END as "Status"
      FROM users u
      LEFT JOIN admin_users au ON u.id = au.user_id
      LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
      LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) as total
        FROM usage_tracking 
        WHERE used_at >= ${startDate.toISOString()}
        GROUP BY user_id
      ) session_count ON u.id = session_count.user_id
      WHERE u."emailVerified" >= ${startDate.toISOString()}
      ORDER BY u."emailVerified" DESC
    `;
    
    return users;
  } catch (error) {
    console.error('Error generating user activity report:', error);
    return [];
  }
}

async function generateRevenueReport(sql, startDate) {
  try {
    const revenue = await sql`
      SELECT 
        DATE(us.created_at) as "Date",
        sp.display_name as "Plan",
        COUNT(us.id) as "New Subscriptions",
        SUM(sp.price) as "Revenue",
        SUM(SUM(sp.price)) OVER (ORDER BY DATE(us.created_at)) as "Cumulative Revenue"
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.created_at >= ${startDate.toISOString()}
        AND us.status = 'active'
        AND sp.name != 'freemium'
      GROUP BY DATE(us.created_at), sp.display_name, sp.price
      ORDER BY DATE(us.created_at) DESC
    `;
    
    return revenue;
  } catch (error) {
    console.error('Error generating revenue report:', error);
    return [];
  }
}

async function generateSessionReport(sql, startDate) {
  try {
    const sessions = await sql`
      SELECT 
        DATE(used_at) as "Date",
        session_type as "Session Type",
        COUNT(*) as "Total Sessions",
        AVG(duration) as "Average Duration",
        COUNT(DISTINCT user_id) as "Unique Users"
      FROM usage_tracking
      WHERE used_at >= ${startDate.toISOString()}
      GROUP BY DATE(used_at), session_type
      ORDER BY DATE(used_at) DESC, session_type
    `;
    
    return sessions;
  } catch (error) {
    console.error('Error generating session report:', error);
    return [];
  }
}

async function generateConversionReport(sql, startDate) {
  try {
    // Get funnel data
    const totalUsers = await sql`SELECT COUNT(*) as count FROM users WHERE "emailVerified" >= ${startDate.toISOString()}`;
    const activeUsers = await sql`SELECT COUNT(DISTINCT user_id) as count FROM usage_tracking WHERE used_at >= ${startDate.toISOString()}`;
    const paidUsers = await sql`
      SELECT COUNT(DISTINCT us.user_id) as count 
      FROM user_subscriptions us 
      JOIN subscription_plans sp ON us.plan_id = sp.id 
      WHERE us.created_at >= ${startDate.toISOString()} 
        AND us.status = 'active' 
        AND sp.name != 'freemium'
    `;

    const total = parseInt(totalUsers[0].count);
    const active = parseInt(activeUsers[0].count);
    const paid = parseInt(paidUsers[0].count);

    return [
      {
        'Stage': 'Registered Users',
        'Users': total,
        'Conversion Rate': '100%',
        'Drop-off Rate': '0%'
      },
      {
        'Stage': 'Active Users',
        'Users': active,
        'Conversion Rate': total > 0 ? `${((active / total) * 100).toFixed(1)}%` : '0%',
        'Drop-off Rate': total > 0 ? `${(((total - active) / total) * 100).toFixed(1)}%` : '0%'
      },
      {
        'Stage': 'Paid Users',
        'Users': paid,
        'Conversion Rate': total > 0 ? `${((paid / total) * 100).toFixed(1)}%` : '0%',
        'Drop-off Rate': total > 0 ? `${(((total - paid) / total) * 100).toFixed(1)}%` : '0%'
      }
    ];
  } catch (error) {
    console.error('Error generating conversion report:', error);
    return [];
  }
}

async function generateUsageReport(sql, startDate) {
  try {
    const usage = await sql`
      SELECT 
        session_type as "Feature",
        COUNT(*) as "Usage Count",
        COUNT(DISTINCT user_id) as "Unique Users",
        ROUND(COUNT(*)::numeric / COUNT(DISTINCT user_id), 2) as "Average Sessions per User"
      FROM usage_tracking
      WHERE used_at >= ${startDate.toISOString()}
      GROUP BY session_type
      ORDER BY "Usage Count" DESC
    `;
    
    return usage;
  } catch (error) {
    console.error('Error generating usage report:', error);
    return [];
  }
}

async function generateSupportReport(sql, startDate) {
  try {
    const support = await sql`
      SELECT 
        DATE(created_at) as "Date",
        COUNT(*) as "Support Notes",
        0 as "Credits Granted",
        COUNT(DISTINCT user_id) as "User Issues"
      FROM user_support_notes
      WHERE created_at >= ${startDate.toISOString()}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) DESC
    `;
    
    return support;
  } catch (error) {
    console.error('Error generating support report:', error);
    return [];
  }
} 