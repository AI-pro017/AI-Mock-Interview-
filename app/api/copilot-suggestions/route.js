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
                max_tokens: 1000,
                response_format: { type: "json_object" }
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

        const systemPrompt = `You are an expert interview coach providing intelligent, context-aware assistance during a live interview. 

CRITICAL INSTRUCTIONS:
1. ANALYZE the full conversation history to understand the context and flow
2. IDENTIFY the most recent meaningful question, request, or topic the interviewer introduced
3. DETERMINE the complexity and type of question (behavioral, technical, situational, etc.)
4. PROVIDE detailed, comprehensive responses tailored to the specific question
5. IGNORE filler words, pleasantries, and casual conversation 
6. FOCUS on what the interviewer actually wants to know or discuss

RESPONSE STRATEGY:
- For TECHNICAL questions: Provide detailed explanations with examples and best practices
- For BEHAVIORAL questions: Structure using STAR method (Situation, Task, Action, Result)
- For SITUATIONAL questions: Offer step-by-step approaches and considerations
- For GENERAL questions: Provide comprehensive, thoughtful responses

RESPONSE FORMAT - You MUST respond ONLY with valid JSON in exactly this format. Do not include any text before or after the JSON:

{
  "suggestions": [
    {
      "type": "Key Points to Mention",
      "content": "[Ultra-concise, 7-15 words max. Quick highlights they should mention]"
    },
    {
      "type": "Structured Response Approach", 
      "content": "[2-4 bullet points, each extremely short (5-8 words). Easy to follow structure]"
    },
    {
      "type": "Specific Examples to Use",
      "content": "[COMPLETE, ready-to-use example with full details: situation, actions taken, technologies used, specific numbers/results, timeline. User should be able to speak this example directly. Generate realistic scenarios with specific details if user profile lacks examples. Make it comprehensive and actionable - include company context, team size, challenges faced, solutions implemented, and measurable outcomes.]"
    },
    {
      "type": "Follow-up Questions",
      "content": "[1-2 engaging questions that capture main ideas and attract interviewer attention. Not too long, not too short]"
    }
  ]
}

FORMATTING RULES:
- Key Points: Maximum 15 words, focus on what to highlight
- Structured Approach: Use bullet points (•), each point 5-8 words max
- Specific Examples: CRITICAL - Provide COMPLETE, ready-to-speak examples with full context, numbers, timeline, and outcomes. Never use templates like "In my role, I..." - give the ENTIRE example with specific details
- Follow-up Questions: Engaging questions that show genuine interest

IMPORTANT: 
- Make suggestions immediately actionable during live interview
- Tailor to the specific question type and user profile
- Focus on practical, quick-to-digest advice

${profileContext ? 'USER PROFILE:\n' + profileContext : 'No user profile available - provide generic but helpful suggestions.'}`;

        const userPrompt = `FULL CONVERSATION HISTORY:
${formattedHistory}

INSTRUCTIONS: 
Analyze the conversation above and identify the most recent meaningful question or topic the interviewer wants to discuss. Pay special attention to:

1. QUESTION TYPE: Is this behavioral, technical, situational, or general?
2. CONTEXT CLUES: What specific skills, experiences, or qualities are they probing?
3. DEPTH REQUIRED: Does this need a brief answer or comprehensive explanation?
4. FOLLOW-UP POTENTIAL: What related topics might they ask about next?

Ignore filler words, pleasantries, and casual conversation. Focus on what they actually want to know and provide detailed, actionable suggestions that match the complexity and type of question being asked.

CRITICAL: Respond ONLY with valid JSON. No explanations, no additional text, just the JSON object with the suggestions array.`;

        const aiResponse = await makeOpenAICallWithRetry(systemPrompt, userPrompt);
        
        // Parse the JSON response with multiple fallback strategies
        let parsedResponse;
        try {
            // First try direct parsing
            parsedResponse = JSON.parse(aiResponse);
        } catch (parseError) {
            // Try to clean and extract JSON
            try {
                // Remove any text before first { and after last }
                let cleanedResponse = aiResponse.trim();
                const firstBrace = cleanedResponse.indexOf('{');
                const lastBrace = cleanedResponse.lastIndexOf('}');
                
                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
                    parsedResponse = JSON.parse(cleanedResponse);
                } else {
                    throw new Error("No valid JSON structure found");
                }
            } catch (extractError) {
                // Fallback to properly formatted suggestions
                const fallbackSuggestions = [
                    { 
                        type: 'Key Points to Mention', 
                        content: 'Relevant experience, quantifiable achievements, specific skills' 
                    },
                    { 
                        type: 'Structured Response Approach', 
                        content: '• Start with context\n• Describe your actions\n• Highlight the results\n• Connect to role requirements' 
                    },
                    { 
                        type: 'Specific Examples to Use', 
                        content: 'At TechCorp, I led a 6-month e-commerce platform overhaul as Senior Developer. Our legacy system had 8-second load times causing 40% cart abandonment. I assembled a 4-person team, chose React/Node.js architecture, and implemented microservices. We migrated 75,000 products using automated scripts, integrated Stripe payments, and deployed with zero downtime using blue-green deployment. Results: 60% faster load times (8s to 3.2s), 25% higher conversion rates, $2M additional quarterly revenue. Challenges included data consistency during migration and real-time inventory sync, solved with Redis caching and event-driven architecture.' 
                    },
                    { 
                        type: 'Follow-up Questions', 
                        content: 'What technologies does your team currently use? How do you measure success in this role?' 
                    }
                ];
                return NextResponse.json({ suggestions: fallbackSuggestions });
            }
        }

        // Validate the parsed response structure
        if (!parsedResponse || !parsedResponse.suggestions || !Array.isArray(parsedResponse.suggestions)) {
            console.error("Invalid AI response structure:", parsedResponse);
            const fallbackSuggestions = [
                { 
                    type: 'Key Points to Mention', 
                    content: 'Relevant experience, quantifiable achievements, specific skills' 
                },
                { 
                    type: 'Structured Response Approach', 
                    content: '• Start with context\n• Describe your actions\n• Highlight the results\n• Connect to role requirements' 
                },
                { 
                    type: 'Specific Examples to Use', 
                    content: 'At TechCorp, I led a 6-month e-commerce platform overhaul as Senior Developer. Our legacy system had 8-second load times causing 40% cart abandonment. I assembled a 4-person team, chose React/Node.js architecture, and implemented microservices. We migrated 75,000 products using automated scripts, integrated Stripe payments, and deployed with zero downtime using blue-green deployment. Results: 60% faster load times (8s to 3.2s), 25% higher conversion rates, $2M additional quarterly revenue. Challenges included data consistency during migration and real-time inventory sync, solved with Redis caching and event-driven architecture.' 
                },
                { 
                    type: 'Follow-up Questions', 
                    content: 'What technologies does your team currently use? How do you measure success in this role?' 
                }
            ];
            return NextResponse.json({ suggestions: fallbackSuggestions });
        }

        return NextResponse.json({ suggestions: parsedResponse.suggestions });

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