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

    const sessionLogs = await sql`
      SELECT 
        ut.id,
        ut.session_id as "sessionId",
        ut.session_type as "sessionType",
        ut.duration,
        ut.used_at as "createdAt",
        u.email as "userEmail",
        CASE 
          WHEN ut.duration IS NULL OR ut.duration < 1 THEN true
          ELSE false
        END as "hasIssues"
      FROM usage_tracking ut
      JOIN users u ON ut.user_id = u.id
      ORDER BY ut.used_at DESC
      LIMIT 100
    `;

    return NextResponse.json(sessionLogs);

  } catch (error) {
    console.error('Session logs fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
