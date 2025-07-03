import { NextResponse } from 'next/server';
import { db } from '@/utils/db';
import { MockInterview, InterviewReport } from '@/utils/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';

export async function GET(req) {
  const session = await auth();

  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userEmail = session.user.email;
    
    // Fetch all interviews created by the current user
    const interviews = await db.select()
      .from(MockInterview)
      .where(eq(MockInterview.createdBy, userEmail))
      .orderBy(MockInterview.createdAt, 'desc'); // Show the newest first

    // Fetch report data for each interview
    const interviewsWithReports = await Promise.all(
      interviews.map(async (interview) => {
        // Get the report data if it exists
        const reports = await db.select()
          .from(InterviewReport)
          .where(eq(InterviewReport.mockIdRef, interview.mockId));
        
        const report = reports.length > 0 ? reports[0] : null;
        
        return {
          ...interview,
          report
        };
      })
    );

    return NextResponse.json(interviewsWithReports);

  } catch (error) {
    console.error('Error fetching interview history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch interview history' }, 
      { status: 500 }
    );
  }
} 