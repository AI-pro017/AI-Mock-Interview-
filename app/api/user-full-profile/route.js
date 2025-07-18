import { NextResponse } from 'next/server';
import { db } from '@/utils/db';
import { UserProfile, WorkHistory, Education, Certifications } from '@/utils/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;

    // Fetch user profile
    const userProfile = await db
      .select()
      .from(UserProfile)
      .where(eq(UserProfile.userEmail, userEmail))
      .limit(1);

    if (userProfile.length === 0) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const profile = userProfile[0];

    // Fetch work history
    const workHistory = await db
      .select()
      .from(WorkHistory)
      .where(eq(WorkHistory.userEmail, userEmail));

    // Fetch education
    const education = await db
      .select()
      .from(Education)
      .where(eq(Education.userEmail, userEmail));

    // Fetch certifications
    const certifications = await db
      .select()
      .from(Certifications)
      .where(eq(Certifications.userEmail, userEmail));

    return NextResponse.json({
      profile,
      workHistory,
      education,
      certifications
    });

  } catch (error) {
    console.error('Error fetching user full profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}