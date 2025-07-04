import { NextResponse } from 'next/server';
import { db } from '@/utils/db';
import { UserProfile, WorkHistory, Education, Certifications } from '@/utils/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';

// Field weights matching the profile page
const fieldWeights = {
    fullName: 5,
    email: 5,
    phoneNumber: 5,
    location: 5,
    professionalTitle: 10,
    yearsOfExperience: 5,
    professionalSummary: 10,
    workHistory: 20,
    skills: 15,
    education: 10,
    certifications: 5,
    hobbiesInterests: 5
};

function calculateCompletion(data) {
    let total = 0;
    if (data.fullName) total += fieldWeights.fullName;
    if (data.email) total += fieldWeights.email;
    if (data.phoneNumber) total += fieldWeights.phoneNumber;
    if (data.locationCity || data.locationCountry) total += fieldWeights.location;
    if (data.professionalTitle) total += fieldWeights.professionalTitle;
    if (data.yearsOfExperience) total += fieldWeights.yearsOfExperience;
    if (data.professionalSummary) total += fieldWeights.professionalSummary;
    if (data.workHistory?.length > 0) total += fieldWeights.workHistory;
    if (data.skills) total += fieldWeights.skills;
    if (data.education?.length > 0) total += fieldWeights.education;
    if (data.certifications?.length > 0) total += fieldWeights.certifications;
    if (data.hobbiesInterests) total += fieldWeights.hobbiesInterests;
    return total;
}

export async function GET(req) {
    const session = await auth();
    const url = new URL(req.url);
    let userEmail = url.searchParams.get('email');
    
    // If no email provided, use the authenticated user's email
    if (!userEmail && session?.user?.email) {
        userEmail = session.user.email;
    }
    
    if (!userEmail) {
        return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }
    
    try {
        // Fetch the user profile
        const userProfiles = await db.select()
            .from(UserProfile)
            .where(eq(UserProfile.email, userEmail));
        
        if (!userProfiles.length) {
            // If no profile found, return a default value
            return NextResponse.json({ completionPercentage: 95 });
        }
        
        const userProfile = userProfiles[0];
        
        // Fetch related data
        const workHistory = await db.select()
            .from(WorkHistory)
            .where(eq(WorkHistory.userProfileId, userProfile.id));
        
        const education = await db.select()
            .from(Education)
            .where(eq(Education.userProfileId, userProfile.id));
        
        const certifications = await db.select()
            .from(Certifications)
            .where(eq(Certifications.userProfileId, userProfile.id));
        
        // Combine all data for calculation
        const completeProfile = {
            ...userProfile,
            workHistory,
            education,
            certifications
        };
        
        // Calculate completion
        const completionPercentage = calculateCompletion(completeProfile);
        
        return NextResponse.json({ completionPercentage });
    } catch (error) {
        console.error('Error fetching profile completion:', error);
        // Return default value on error
        return NextResponse.json({ completionPercentage: 95 }, { status: 500 });
    }
} 