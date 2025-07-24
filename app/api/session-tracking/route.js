import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/utils/db';
import { sessionDetails } from '@/utils/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Start a new session
export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      sessionType, // 'mock_interview' or 'interview_copilot'
      jobPosition,
      jobLevel,
      industry,
      mockId // For mock interviews
    } = body;

    if (!sessionType || !['mock_interview', 'interview_copilot'].includes(sessionType)) {
      return NextResponse.json({ error: 'Invalid session type' }, { status: 400 });
    }

    const sessionId = mockId || uuidv4();

    // Create session details record
    const sessionDetail = await db.insert(sessionDetails).values({
      sessionId,
      userId: session.user.id,
      sessionType,
      jobPosition,
      jobLevel,
      industry,
      status: 'active',
      startedAt: new Date(),
      transcript: JSON.stringify([]),
      suggestions: JSON.stringify([])
    }).returning();

    console.log(`✅ Started ${sessionType} session:`, sessionId);

    return NextResponse.json({ 
      success: true, 
      sessionId,
      sessionDetailId: sessionDetail[0].id
    });

  } catch (error) {
    console.error('Session start error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}