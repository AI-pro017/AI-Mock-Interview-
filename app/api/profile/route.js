import { NextResponse } from 'next/server';
import { db } from '@/utils/db';
import { UserProfile, WorkHistory, Education, Certifications } from '@/utils/schema';
import { eq } from 'drizzle-orm';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    // Find the user profile
    const userProfiles = await db.select().from(UserProfile).where(eq(UserProfile.email, email));
    
    if (!userProfiles || userProfiles.length === 0) {
      return NextResponse.json(null); // No profile found
    }
    
    const userProfile = userProfiles[0];
    
    // Find work history
    const workHistory = await db.select().from(WorkHistory).where(eq(WorkHistory.userProfileId, userProfile.id));
    
    // Find education
    const education = await db.select().from(Education).where(eq(Education.userProfileId, userProfile.id));
    
    // Find certifications
    const certifications = await db.select().from(Certifications).where(eq(Certifications.userProfileId, userProfile.id));
    
    // Combine everything into a single response
    const completeProfile = {
      ...userProfile,
      workHistory,
      education,
      certifications,
    };
    
    return NextResponse.json(completeProfile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
} 