import { NextResponse } from 'next/server';
import { db } from '@/utils/db';
import { MockInterview, InterviewReport } from '@/utils/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const session = await auth();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const interviews = await db
      .select({
        mockId: MockInterview.mockId,
        jobPosition: MockInterview.jobPosition,
        jobDesc: MockInterview.jobDesc,
        jobExperience: MockInterview.jobExperience,
        createdAt: MockInterview.createdAt,
        rating: InterviewReport.rating,
        feedback: InterviewReport.feedback,
        overallFeedback: InterviewReport.overallFeedback,
      })
      .from(MockInterview)
      .leftJoin(InterviewReport, eq(MockInterview.mockId, InterviewReport.mockInterviewId))
      .where(eq(MockInterview.createdBy, session.user.email))
      .orderBy(MockInterview.createdAt);

    // Group by mockId to handle potential duplicates
    const groupedInterviews = interviews.reduce((acc, interview) => {
      const existing = acc.find(item => item.mockId === interview.mockId);
      if (!existing) {
        acc.push(interview);
      }
      return acc;
    }, []);

    return NextResponse.json(groupedInterviews);
  } catch (error) {
    console.error('Error fetching interview history:', error);
    return NextResponse.json({ error: 'Failed to fetch interview history' }, { status: 500 });
  }
} 