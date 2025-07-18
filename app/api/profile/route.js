import { NextResponse } from 'next/server';
import { db } from '@/utils/db';
import { UserProfile, WorkHistory, Education, Certifications } from '@/utils/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
  }

  try {
    // Fetch user profile
    const userProfile = await db
      .select()
      .from(UserProfile)
      .where(eq(UserProfile.userEmail, email))
      .limit(1);

    if (userProfile.length === 0) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const profile = userProfile[0];

    // Fetch work history
    const workHistory = await db
      .select()
      .from(WorkHistory)
      .where(eq(WorkHistory.userEmail, email));

    // Fetch education
    const education = await db
      .select()
      .from(Education)
      .where(eq(Education.userEmail, email));

    // Fetch certifications
    const certifications = await db
      .select()
      .from(Certifications)
      .where(eq(Certifications.userEmail, email));

    return NextResponse.json({
      profile,
      workHistory,
      education,
      certifications
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const {
      firstName,
      lastName,
      phoneNumber,
      address,
      jobTitle,
      jobDescription,
      jobExperience,
      workHistory,
      education,
      certifications
    } = data;

    const userEmail = session.user.email;

    // Start a transaction
    await db.transaction(async (tx) => {
      // Insert or update user profile
      await tx
        .insert(UserProfile)
        .values({
          firstName,
          lastName,
          userEmail,
          phoneNumber,
          address,
          jobTitle,
          jobDescription,
          jobExperience,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: UserProfile.userEmail,
          set: {
            firstName,
            lastName,
            phoneNumber,
            address,
            jobTitle,
            jobDescription,
            jobExperience,
            updatedAt: new Date()
          }
        });

      // Delete existing work history and insert new ones
      await tx.delete(WorkHistory).where(eq(WorkHistory.userEmail, userEmail));
      if (workHistory && workHistory.length > 0) {
        await tx.insert(WorkHistory).values(
          workHistory.map(work => ({
            ...work,
            userEmail,
            createdAt: new Date()
          }))
        );
      }

      // Delete existing education and insert new ones
      await tx.delete(Education).where(eq(Education.userEmail, userEmail));
      if (education && education.length > 0) {
        await tx.insert(Education).values(
          education.map(edu => ({
            ...edu,
            userEmail,
            createdAt: new Date()
          }))
        );
      }

      // Delete existing certifications and insert new ones
      await tx.delete(Certifications).where(eq(Certifications.userEmail, userEmail));
      if (certifications && certifications.length > 0) {
        await tx.insert(Certifications).values(
          certifications.map(cert => ({
            ...cert,
            userEmail,
            createdAt: new Date()
          }))
        );
      }
    });

    return NextResponse.json({ message: 'Profile saved successfully' });

  } catch (error) {
    console.error('Error saving profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 