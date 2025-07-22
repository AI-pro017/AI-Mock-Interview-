import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { neon } from '@neondatabase/serverless';

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

    // Get user's session history
    const userSessions = await sql`
      SELECT 
        ut.id,
        ut.session_id as "sessionId",
        ut.session_type as "sessionType",
        ut.duration,
        ut.used_at as "usedAt",
        ut.billing_month as "billingMonth",
        mi."jobPosition",
        mi."jobDesc",
        mi.difficulty,
        mi."createdAt" as "interviewCreatedAt"
      FROM usage_tracking ut
      LEFT JOIN "mockInterview" mi ON ut.session_id = mi."mockId"
      WHERE ut.user_id = ${userId}
      ORDER BY ut.used_at DESC
      LIMIT 50
    `;

    return NextResponse.json(userSessions);

  } catch (error) {
    console.error('User sessions fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 