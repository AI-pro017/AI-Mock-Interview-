import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { neon } from '@neondatabase/serverless';

export async function GET() {
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

    // Get live sessions (sessions from last 30 minutes that might still be active)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const liveSessions = await sql`
      SELECT 
        ut.id,
        ut.session_id as "sessionId",
        ut.session_type as "sessionType",
        ut.duration,
        ut.used_at as "usedAt",
        u.email as "userEmail",
        mi."jobPosition",
        EXTRACT(EPOCH FROM (NOW() - ut.used_at)) / 60 as "minutesAgo"
      FROM usage_tracking ut
      JOIN users u ON ut.user_id = u.id
      LEFT JOIN "mockInterview" mi ON ut.session_id = mi."mockId"
      WHERE ut.used_at >= ${thirtyMinutesAgo.toISOString()}
        AND (ut.duration IS NULL OR ut.duration = 0)
      ORDER BY ut.used_at DESC
      LIMIT 20
    `;

    // Transform data for frontend
    const transformedSessions = liveSessions.map(session => ({
      ...session,
      type: session.sessionType,
      duration: Math.round(session.minutesAgo || 0)
    }));

    console.log(`✅ Found ${transformedSessions.length} live sessions`);

    return NextResponse.json(transformedSessions);

  } catch (error) {
    console.error('Live sessions fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
