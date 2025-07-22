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

    console.log('✅ Fetching sessions...');

    // Get recent sessions from usage tracking with correct column names
    const sessions = await sql`
      SELECT 
        ut.id,
        ut.session_id as "sessionId",
        ut.session_type as "sessionType",
        ut.duration,
        ut.used_at as "usedAt",
        u.email as "userEmail",
        mi."jobPosition"
      FROM usage_tracking ut
      JOIN users u ON ut.user_id = u.id
      LEFT JOIN "mockInterview" mi ON ut.session_id = mi."mockId"
      ORDER BY ut.used_at DESC
      LIMIT 50
    `;

    console.log(`✅ Found ${sessions.length} sessions`);

    return NextResponse.json(sessions);

  } catch (error) {
    console.error('Sessions fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
