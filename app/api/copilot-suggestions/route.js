import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { db } from '@/utils/db';
import { UserProfile, WorkHistory, Education, Certifications } from '@/utils/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to fetch user profile
async function fetchUserProfile(userEmail) {
    try {
        const userProfiles = await db.select().from(UserProfile).where(eq(UserProfile.email, userEmail));
        
        if (!userProfiles || userProfiles.length === 0) {
            return null;
        }
        
        const userProfile = userProfiles[0];
        
        // Find work history
        const workHistory = await db.select().from(WorkHistory).where(eq(WorkHistory.userProfileId, userProfile.id));
        
        // Find education
        const education = await db.select().from(Education).where(eq(Education.userProfileId, userProfile.id));
        
        // Find certifications
        const certifications = await db.select().from(Certifications).where(eq(Certifications.userProfileId, userProfile.id));
        
        return {
            ...userProfile,
            workHistory,
            education,
            certifications,
        };
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
}

// Helper function to format profile data for AI
function formatProfileForAI(profile) {
    if (!profile) return '';
    
    let profileText = '';
    
    // Basic info - using correct field names from schema
    if (profile.fullName) profileText += `Name: ${profile.fullName}\n`;
    if (profile.professionalTitle) profileText += `Current Role: ${profile.professionalTitle}\n`;
    if (profile.yearsOfExperience) profileText += `Years of Experience: ${profile.yearsOfExperience}\n`;
    if (profile.locationCity && profile.locationCountry) profileText += `Location: ${profile.locationCity}, ${profile.locationCountry}\n`;
    if (profile.skills) profileText += `Skills: ${profile.skills}\n`;
    if (profile.professionalSummary) profileText += `Professional Summary: ${profile.professionalSummary}\n`;
    if (profile.hobbiesInterests) profileText += `Hobbies & Interests: ${profile.hobbiesInterests}\n`;
    
    // Work history - using correct field names from schema
    if (profile.workHistory && profile.workHistory.length > 0) {
        profileText += '\nWork History:\n';
        profile.workHistory.forEach(work => {
            profileText += `- ${work.jobTitle} at ${work.companyName} (${work.startDate} - ${work.endDate || 'Present'})\n`;
            if (work.description) profileText += `  ${work.description}\n`;
        });
    }
    
    // Education - using correct field names from schema
    if (profile.education && profile.education.length > 0) {
        profileText += '\nEducation:\n';
        profile.education.forEach(edu => {
            profileText += `- ${edu.degreeType} in ${edu.fieldOfStudy} from ${edu.institutionName} (${edu.graduationYear})\n`;
            if (edu.gpa) profileText += `  GPA: ${edu.gpa}\n`;
        });
    }
    
    // Certifications - using correct field names from schema
    if (profile.certifications && profile.certifications.length > 0) {
        profileText += '\nCertifications:\n';
        profile.certifications.forEach(cert => {
            profileText += `- ${cert.name} from ${cert.issuingOrg} (${cert.date})\n`;
        });
    }
    
    return profileText;
}

export async function POST(req) {
    try {
        const { question, history } = await req.json();

        if (!question) {
            return NextResponse.json({ error: 'Question is required' }, { status: 400 });
        }
        console.log('question', question);
        console.log('history', history);

        // Get user session
        const session = await auth();
        
        // Fetch user profile if authenticated
        let userProfile = null;
        if (session?.user?.email) {
            userProfile = await fetchUserProfile(session.user.email);
        }

        const formattedHistory = (history || [])
            .map(turn => `${turn.speaker}: ${turn.text}`)
            .join('\n');

        const profileContext = formatProfileForAI(userProfile);

        const systemPrompt = `You are an expert interview coach providing real-time, concise advice. A user is in a live interview.
        You will be given the conversation history, the latest question from the interviewer, and the user's profile information.
        Your task is to provide three brief, actionable suggestions based on the user's background and experience.

        1. **Key Point to Mention**: A core idea, skill, or experience from their profile that the user should include in their answer. Start with "Focus on...".
        2. **Smart Question to Ask**: A thoughtful follow-up question the user could ask to show engagement or clarify the interviewer's question. Start with "Consider asking...".
        3. **Direct Answer Hints**: A specific, direct response or phrase the user could use to start their answer, leveraging their background. Start with "You could say..." or "Try starting with...".
        
        Keep your suggestions extremely brief (10-15 words max). The user needs to glance at them during a live conversation.
        Base your suggestions on the provided conversation history and user profile to make them personalized and relevant.
        
        ${profileContext ? 'USER PROFILE:\n' + profileContext : 'No user profile available - provide generic but helpful suggestions.'}`;

        const userPrompt = `
        CONVERSATION HISTORY:
        ${formattedHistory}

        LATEST QUESTION FROM INTERVIEWER:
        "${question}"

        Your concise, personalized suggestions:
        `;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.6,
            max_tokens: 200,
        });

        const aiResponse = response.choices[0].message.content.trim();
        
        const suggestions = aiResponse.split('\n').map(line => {
            const cleanLine = line.trim();
            if (!cleanLine) return null;

            if (cleanLine.toLowerCase().includes('focus on')) {
                // Remove any numbering, asterisks, and "Key Point to Mention" labels
                const content = cleanLine
                    .replace(/^\d+\.\s*/, '') // Remove numbering like "1. "
                    .replace(/\*\*Key Point to Mention\*\*:?\s*/i, '') // Remove "**Key Point to Mention**:"
                    .replace(/Key Point to Mention:?\s*/i, '') // Remove "Key Point to Mention:"
                    .replace(/^\*+/, '') // Remove leading asterisks
                    .replace(/\*+$/, '') // Remove trailing asterisks
                    .trim();
                return { type: 'Key Point to Mention', content };
            }
            if (cleanLine.toLowerCase().includes('consider asking')) {
                const content = cleanLine
                    .replace(/^\d+\.\s*/, '')
                    .replace(/\*\*Smart Question to Ask\*\*:?\s*/i, '')
                    .replace(/Smart Question to Ask:?\s*/i, '')
                    .replace(/^\*+/, '')
                    .replace(/\*+$/, '')
                    .trim();
                return { type: 'Smart Question to Ask', content };
            }
            if (cleanLine.toLowerCase().includes('you could say') || cleanLine.toLowerCase().includes('try starting with')) {
                const content = cleanLine
                    .replace(/^\d+\.\s*/, '')
                    .replace(/\*\*Direct Answer Hints\*\*:?\s*/i, '')
                    .replace(/Direct Answer Hints:?\s*/i, '')
                    .replace(/^\*+/, '')
                    .replace(/\*+$/, '')
                    .trim();
                return { type: 'Direct Answer Hints', content };
            }
            return null;
        }).filter(Boolean);

        return NextResponse.json({ suggestions });

    } catch (error) {
        console.error("Error in copilot suggestions:", error);
        return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
    }
} 