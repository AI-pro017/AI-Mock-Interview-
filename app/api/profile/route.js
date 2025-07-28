import { NextResponse } from 'next/server';
import { db } from '@/utils/db';
import { UserProfile, WorkHistory, Education, Certifications } from '@/utils/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { requireActiveUser } from '@/utils/auth-helpers';

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

export async function POST(request) {
  try {
    // 🔒 Add disabled user check
    const userCheck = await requireActiveUser();
    if (userCheck.error) {
      return NextResponse.json(
        { error: userCheck.message }, 
        { status: userCheck.status }
      );
    }

    const session = await auth();
    const userEmail = session.user.email;
    const formData = await request.json();

    // Step 1: Find or create the user profile
    let userProfile = await db
      .select()
      .from(UserProfile)
      .where(eq(UserProfile.email, userEmail))
      .then(profiles => profiles[0]);

    if (!userProfile) {
      // Create a new user profile
      [userProfile] = await db
        .insert(UserProfile)
        .values({
          email: userEmail,
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          professionalTitle: formData.professionalTitle,
          locationCity: formData.location?.city,
          locationCountry: formData.location?.country,
          yearsOfExperience: formData.yearsOfExperience,
          professionalSummary: formData.professionalSummary,
          skills: Array.isArray(formData.skills) ? formData.skills.join(', ') : formData.skills,
          hobbiesInterests: formData.hobbiesInterests,
        })
        .returning();
    } else {
      // Update existing profile
      await db
        .update(UserProfile)
        .set({
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          professionalTitle: formData.professionalTitle,
          locationCity: formData.location?.city,
          locationCountry: formData.location?.country,
          yearsOfExperience: formData.yearsOfExperience,
          professionalSummary: formData.professionalSummary,
          skills: Array.isArray(formData.skills) ? formData.skills.join(', ') : formData.skills,
          hobbiesInterests: formData.hobbiesInterests,
        })
        .where(eq(UserProfile.email, userEmail));
    }

    const userProfileId = userProfile.id;

    // Step 2: Handle Work History
    await db.delete(WorkHistory).where(eq(WorkHistory.userProfileId, userProfileId));
    if (formData.workHistory?.length > 0) {
      await db.insert(WorkHistory).values(
        formData.workHistory.map(item => ({ ...item, userProfileId }))
      );
    }

    // Step 3: Handle Education
    await db.delete(Education).where(eq(Education.userProfileId, userProfileId));
    if (formData.education?.length > 0) {
      await db.insert(Education).values(
        formData.education.map(item => ({ ...item, userProfileId }))
      );
    }
    
    // Step 4: Handle Certifications
    await db.delete(Certifications).where(eq(Certifications.userProfileId, userProfileId));
    if (formData.certifications?.length > 0) {
      await db.insert(Certifications).values(
        formData.certifications.map(item => ({ ...item, userProfileId }))
      );
    }

    return NextResponse.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Failed to update profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
} 