import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { db } from '@/utils/db';
import { UserProfile, WorkHistory, Education, Certifications } from '@/utils/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Rate limiting and retry configuration
const RATE_LIMIT_CONFIG = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
};

// Helper function to wait for a specified time
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to calculate exponential backoff delay
const calculateBackoffDelay = (attempt, baseDelay, maxDelay) => {
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    return delay + Math.random() * 1000;
};

// Helper function to extract retry delay from OpenAI error
const getRetryDelay = (error) => {
    if (error.status === 429) {
        const retryAfter = error.headers?.['retry-after'];
        if (retryAfter) {
            return parseInt(retryAfter) * 1000;
        }
        
        const match = error.message.match(/try again in (\d+\.?\d*)s/);
        if (match) {
            return Math.ceil(parseFloat(match[1]) * 1000);
        }
    }
    return null;
};

// Helper function to fetch user profile
async function fetchUserProfile(userEmail) {
    try {
        const userProfiles = await db.select().from(UserProfile).where(eq(UserProfile.email, userEmail));
        
        if (!userProfiles || userProfiles.length === 0) {
            return null;
        }
        
        const userProfile = userProfiles[0];
        
        const workHistory = await db.select().from(WorkHistory).where(eq(WorkHistory.userProfileId, userProfile.id));
        const education = await db.select().from(Education).where(eq(Education.userProfileId, userProfile.id));
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
    
    if (profile.fullName) profileText += `Name: ${profile.fullName}\n`;
    if (profile.professionalTitle) profileText += `Current Role: ${profile.professionalTitle}\n`;
    if (profile.yearsOfExperience) profileText += `Years of Experience: ${profile.yearsOfExperience}\n`;
    if (profile.locationCity && profile.locationCountry) profileText += `Location: ${profile.locationCity}, ${profile.locationCountry}\n`;
    if (profile.skills) profileText += `Skills: ${profile.skills}\n`;
    if (profile.professionalSummary) profileText += `Professional Summary: ${profile.professionalSummary}\n`;
    if (profile.hobbiesInterests) profileText += `Hobbies & Interests: ${profile.hobbiesInterests}\n`;
    
    if (profile.workHistory && profile.workHistory.length > 0) {
        profileText += '\nWork History:\n';
        profile.workHistory.forEach(work => {
            profileText += `- ${work.jobTitle} at ${work.companyName} (${work.startDate} - ${work.endDate || 'Present'})\n`;
            if (work.description) profileText += `  ${work.description}\n`;
        });
    }
    
    if (profile.education && profile.education.length > 0) {
        profileText += '\nEducation:\n';
        profile.education.forEach(edu => {
            profileText += `- ${edu.degreeType} in ${edu.fieldOfStudy} from ${edu.institutionName} (${edu.graduationYear})\n`;
            if (edu.gpa) profileText += `  GPA: ${edu.gpa}\n`;
        });
    }
    
    if (profile.certifications && profile.certifications.length > 0) {
        profileText += '\nCertifications:\n';
        profile.certifications.forEach(cert => {
            profileText += `- ${cert.name} from ${cert.issuingOrg} (${cert.date})\n`;
        });
    }
    
    return profileText;
}

// Helper function to make OpenAI API call with retry logic
async function makeOpenAICallWithRetry(systemPrompt, userPrompt, maxRetries = RATE_LIMIT_CONFIG.maxRetries) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.6,
                max_tokens: 200,
            });

            return response.choices[0].message.content.trim();
        } catch (error) {
            lastError = error;
            
            if (error.status !== 429) {
                throw error;
            }
            
            if (attempt === maxRetries) {
                throw error;
            }
            
            let delayMs;
            const retryDelay = getRetryDelay(error);
            
            if (retryDelay) {
                delayMs = retryDelay;
            } else {
                delayMs = calculateBackoffDelay(attempt, RATE_LIMIT_CONFIG.baseDelay, RATE_LIMIT_CONFIG.maxDelay);
            }
            
            await sleep(delayMs);
        }
    }
    
    throw lastError;
}

export async function POST(req) {
    try {
        const { question, history } = await req.json();

        if (!question) {
            return NextResponse.json({ error: 'Question is required' }, { status: 400 });
        }

        const session = await auth();
        
        let userProfile = null;
        if (session?.user?.email) {
            userProfile = await fetchUserProfile(session.user.email);
        }

        const formattedHistory = (history || [])
            .map(turn => `${turn.speaker}: ${turn.text}`)
            .join('\n');

        const profileContext = formatProfileForAI(userProfile);

        const systemPrompt = `You are an expert interview coach providing real-time assistance during a live interview. 

CRITICAL INSTRUCTIONS:
1. ANALYZE the full conversation history to understand the context and flow
2. IDENTIFY the most recent meaningful question, request, or topic the interviewer introduced
3. IGNORE filler words, pleasantries, and casual conversation 
4. FOCUS on what the interviewer actually wants to know or discuss

RESPONSE FORMAT - You MUST respond in exactly this format:

KEY_POINT: Focus on [specific advice about what to mention from their background]
QUESTION: Consider asking [specific question they should ask the interviewer]  
ANSWER: Try starting with [specific way to begin their response]

EXAMPLE:
KEY_POINT: Focus on your experience with React and Node.js development
QUESTION: Consider asking about the team's current tech stack preferences
ANSWER: Try starting with "In my previous role, I worked extensively with..."

Make each suggestion 10-15 words and highly relevant to what the interviewer is asking.

${profileContext ? 'USER PROFILE:\n' + profileContext : 'No user profile available - provide generic but helpful suggestions.'}`;

        const userPrompt = `FULL CONVERSATION HISTORY:
${formattedHistory}

INSTRUCTIONS: 
Analyze the conversation above. Find the most recent meaningful question or topic the interviewer wants to discuss. Ignore filler words and casual conversation. Focus on what they actually want to know.

Provide three targeted suggestions in the exact format specified:`;

        const aiResponse = await makeOpenAICallWithRetry(systemPrompt, userPrompt);
        
        // Parse the structured response
        const suggestions = [];
        const lines = aiResponse.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
            const cleanLine = line.trim();
            
            if (cleanLine.startsWith('KEY_POINT:')) {
                const content = cleanLine.replace('KEY_POINT:', '').trim();
                suggestions.push({ type: 'Key Point to Mention', content });
            } else if (cleanLine.startsWith('QUESTION:')) {
                const content = cleanLine.replace('QUESTION:', '').trim();
                suggestions.push({ type: 'Smart Question to Ask', content });
            } else if (cleanLine.startsWith('ANSWER:')) {
                const content = cleanLine.replace('ANSWER:', '').trim();
                suggestions.push({ type: 'Direct Answer Hints', content });
            }
        }

        // If we don't have all 3 suggestions, create a proper fallback
        if (suggestions.length < 3) {
            const fallbackSuggestions = [
                { type: 'Key Point to Mention', content: 'Focus on your most relevant experience and specific examples' },
                { type: 'Smart Question to Ask', content: 'Consider asking about team dynamics or growth opportunities' },
                { type: 'Direct Answer Hints', content: 'Try starting with "In my experience..." or "I\'ve found that..."' }
            ];
            
            if (suggestions.length > 0) {
                const combined = [...suggestions];
                while (combined.length < 3) {
                    const fallback = fallbackSuggestions[combined.length];
                    combined.push(fallback);
                }
                return NextResponse.json({ suggestions: combined });
            } else {
                return NextResponse.json({ suggestions: fallbackSuggestions });
            }
        }

        return NextResponse.json({ suggestions });

    } catch (error) {
        console.error("Error in copilot suggestions:", error);
        
        if (error.status === 429) {
            return NextResponse.json({ 
                error: 'Rate limit exceeded. Please wait a moment before trying again.' 
            }, { status: 429 });
        } else if (error.status >= 500) {
            return NextResponse.json({ 
                error: 'OpenAI service temporarily unavailable. Please try again.' 
            }, { status: 502 });
        } else if (error.status === 401) {
            return NextResponse.json({ 
                error: 'Authentication error with AI service.' 
            }, { status: 500 });
        } else {
            return NextResponse.json({ 
                error: 'Failed to generate AI suggestions. Please try again.' 
            }, { status: 500 });
        }
    }
} 