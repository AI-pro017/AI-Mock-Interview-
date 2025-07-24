import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/utils/db';
import { sessionDetails, users, MockInterview } from '@/utils/schema';
import { eq, desc, sql } from 'drizzle-orm';
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

    console.log('✅ Fetching session history...');

    // Get recent sessions with enhanced details
    const sessions = await db
      .select({
        id: sessionDetails.id,
        sessionId: sessionDetails.sessionId,
        sessionType: sessionDetails.sessionType,
        jobPosition: sessionDetails.jobPosition,
        jobLevel: sessionDetails.jobLevel,
        industry: sessionDetails.industry,
        status: sessionDetails.status,
        startedAt: sessionDetails.startedAt,
        completedAt: sessionDetails.completedAt,
        totalQuestions: sessionDetails.totalQuestions,
        questionsAnswered: sessionDetails.questionsAnswered,
        averageResponseTime: sessionDetails.averageResponseTime,
        transcript: sessionDetails.transcript,
        suggestions: sessionDetails.suggestions,
        userEmail: users.email,
        userName: users.name,
        duration: sql`EXTRACT(EPOCH FROM (COALESCE(${sessionDetails.completedAt}, NOW()) - ${sessionDetails.startedAt})) / 60`
      })
      .from(sessionDetails)
      .innerJoin(users, eq(sessionDetails.userId, users.id))
      .where(eq(sessionDetails.status, 'completed'))
      .orderBy(desc(sessionDetails.completedAt))
      .limit(100);

    console.log(`✅ Found ${sessions.length} completed sessions`);

    return NextResponse.json(sessions);

  } catch (error) {
    console.error('Sessions fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
