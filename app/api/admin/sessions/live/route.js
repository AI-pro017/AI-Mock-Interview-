import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/utils/db';
import { sessionDetails, users } from '@/utils/schema';
import { eq, sql, and, gte } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin authorization using raw SQL query
    const sqlClient = neon(process.env.NEXT_PUBLIC_DRIZZLE_DB_URL);
    const adminUser = await sqlClient`
      SELECT * FROM admin_users WHERE user_id = ${session.user.id} AND is_active = true
    `;

    if (adminUser.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get live sessions (active sessions from last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const liveSessions = await db
      .select({
        id: sessionDetails.id,
        sessionId: sessionDetails.sessionId,
        sessionType: sessionDetails.sessionType,
        jobPosition: sessionDetails.jobPosition,
        jobLevel: sessionDetails.jobLevel,
        industry: sessionDetails.industry,
        status: sessionDetails.status,
        startedAt: sessionDetails.startedAt,
        totalQuestions: sessionDetails.totalQuestions,
        questionsAnswered: sessionDetails.questionsAnswered,
        userEmail: users.email,
        userName: users.name,
        duration: sql`EXTRACT(EPOCH FROM (NOW() - ${sessionDetails.startedAt})) / 60`,
        transcriptLength: sql`LENGTH(COALESCE(${sessionDetails.transcript}, '[]'))`,
        suggestionsCount: sql`jsonb_array_length(COALESCE(${sessionDetails.suggestions}::jsonb, '[]'::jsonb))`
      })
      .from(sessionDetails)
      .innerJoin(users, eq(sessionDetails.userId, users.id))
      .where(and(
        eq(sessionDetails.status, 'active'),
        gte(sessionDetails.startedAt, twoHoursAgo)
      ))
      .orderBy(sessionDetails.startedAt);

    console.log(`✅ Found ${liveSessions.length} live sessions`);

    return NextResponse.json(liveSessions);

  } catch (error) {
    console.error('Live sessions fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
