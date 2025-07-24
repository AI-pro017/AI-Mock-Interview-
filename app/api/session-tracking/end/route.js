import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/utils/db';
import { sessionDetails } from '@/utils/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      sessionId,
      duration, // in minutes
      transcript,
      suggestions,
      totalQuestions,
      questionsAnswered,
      averageResponseTime,
      status = 'completed' // 'completed' or 'abandoned'
    } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Update session details
    const updateData = {
      status,
      completedAt: new Date(),
      updatedAt: new Date()
    };

    if (transcript) updateData.transcript = JSON.stringify(transcript);
    if (suggestions) updateData.suggestions = JSON.stringify(suggestions);
    if (totalQuestions) updateData.totalQuestions = totalQuestions;
    if (questionsAnswered) updateData.questionsAnswered = questionsAnswered;
    if (averageResponseTime) updateData.averageResponseTime = averageResponseTime;

    await db.update(sessionDetails)
      .set(updateData)
      .where(and(
        eq(sessionDetails.sessionId, sessionId),
        eq(sessionDetails.userId, session.user.id)
      ));

    console.log(`✅ Ended session: ${sessionId} (${duration} minutes)`);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Session end error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}