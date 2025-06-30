import { NextResponse } from 'next/server';
import { db } from '@/utils/db';
import { MockInterview } from '@/utils/schema';
import { eq } from 'drizzle-orm';
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

    return NextResponse.json(interviews);

  } catch (error) {
    console.error('Error fetching interview history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch interview history' }, 
      { status: 500 }
    );
  }
} 