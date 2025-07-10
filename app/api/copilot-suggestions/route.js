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

        const systemPrompt = `You are an interview assistant. Your job is to interpret unclear/poorly worded questions and provide structured responses.

FIRST: Interpret the real intent behind the question, even if it has poor grammar or unclear wording.
SECOND: Determine the best response structure from these options:
- Describe → Explain → Highlight Achievements (for experience questions)
- Define → Compare → Demonstrate with Code (for comparison questions)
- Define → Explain → Show with Code (for concept/technical questions)
- Context → Action → Results (for behavioral questions)
- Problem → Solution → Impact (for problem-solving questions)

THIRD: Respond ONLY with JSON in this exact format:

{
  "suggestions": [
    {
      "type": "Key Points to Mention",
      "content": "[7-15 words max. Quick highlights they should mention]"
    },
    {
      "type": "💬 Sample Response",
      "content": "[COMPLETE, ready-to-speak response following your internally chosen structure. For technical questions, ALWAYS include relevant code examples. Start with interpretation if the question was unclear (e.g., 'I believe you're asking about...'). Include specific examples, technologies, numbers, timeline, and outcomes. User should be able to speak this response directly.]"
    }
  ]
}

FORMATTING RULES:
- Key Points: Maximum 15 words, focus on what to highlight
- Sample Response: CRITICAL - 
  * Internally choose the best structure (Define → Compare → Demonstrate, etc.) but don't show it in output
  * Start with question interpretation if unclear (e.g., "I believe you're asking about...")
  * Follow your chosen structure exactly in the response organization
  * For technical questions, ALWAYS include working code examples
  * Include specific scenarios with context, numbers, timeline, and outcomes
  * Make it conversational and ready-to-speak

QUESTION INTERPRETATION EXAMPLES:
- "What's the difference between dictionary and the listers in Python?" → "What's the difference between dictionaries and lists in Python?"
- "What do you what are, like, classes in Python?" → "Can you explain what classes are in Python?"
- "Can you tell us about your ex experience on Azure Databricks?" → "Can you tell us about your past experience with Azure Databricks?"

EXAMPLE OUTPUT FORMAT:

For experience questions like "Can you tell us about your ex experience on Azure Databricks?":
- Key Points: "Role using Databricks, data workflows, Delta Lake, optimization techniques"
- Sample Response: Use "Describe → Explain → Highlight Achievements" structure internally. Complete answer with specific project details, technologies, and measurable results

For comparison questions like "What's the difference between dictionary and the listers in Python?":
- Key Points: "List ordered index-based, dictionary key-value mapping, performance differences"  
- Sample Response: Use "Define → Compare → Demonstrate with Code" structure internally. Define both concepts, compare differences, include working code examples

For concept questions like "What do you what are, like, classes in Python?":
- Key Points: "Class blueprint for objects, encapsulation, reusable logic modeling"
- Sample Response: Use "Define → Explain → Show with Code" structure internally. Define classes, explain concepts, provide complete code examples with class definition and usage

STRUCTURE SELECTION GUIDE:
- Experience questions ("Tell me about your experience with...") → Describe → Explain → Highlight Achievements
- Comparison questions ("What's the difference between X and Y?") → Define → Compare → Demonstrate with Code
- Concept questions ("What are classes in Python?") → Define → Explain → Show with Code
- Behavioral questions ("Tell me about a time when...") → Context → Action → Results
- Problem-solving questions ("How would you solve...?") → Problem → Solution → Impact

IMPORTANT: 
- Always interpret the question's real intent first
- Choose the most appropriate structure from the options above
- For technical questions, include working code examples in the sample response
- Make suggestions immediately actionable during live interview
- Tailor to the specific question type and user profile

${profileContext ? 'USER PROFILE:\n' + profileContext : 'No user profile available - provide generic but helpful suggestions.'}`;

        const userPrompt = `Question: ${question}

Conversation: ${formattedHistory}

Generate interview suggestions in the exact JSON format specified. Focus on the most recent question.`;

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
                        type: '💬 Sample Response', 
                        content: 'At TechCorp, I led a 6-month e-commerce platform overhaul as Senior Developer. Our legacy system had 8-second load times causing 40% cart abandonment. I assembled a 4-person team, chose React/Node.js architecture, and implemented microservices. We migrated 75,000 products using automated scripts, integrated Stripe payments, and deployed with zero downtime using blue-green deployment. Results: 60% faster load times (8s to 3.2s), 25% higher conversion rates, $2M additional quarterly revenue. Challenges included data consistency during migration and real-time inventory sync, solved with Redis caching and event-driven architecture.' 
                    }
                ];
                return NextResponse.json({ suggestions: fallbackSuggestions });
            }
        }

        // Validate the parsed response structure
        if (!parsedResponse || !parsedResponse.suggestions || !Array.isArray(parsedResponse.suggestions)) {
            // Use fallback suggestions
            parsedResponse = {
                suggestions: [
                    { 
                        type: 'Key Points to Mention', 
                        content: 'Relevant experience, quantifiable achievements, specific skills' 
                    },
                    { 
                        type: '💬 Sample Response', 
                        content: 'At TechCorp, I led a 6-month e-commerce platform overhaul as Senior Developer. Our legacy system had 8-second load times causing 40% cart abandonment. I assembled a 4-person team, chose React/Node.js architecture, and implemented microservices. We migrated 75,000 products using automated scripts, integrated Stripe payments, and deployed with zero downtime using blue-green deployment. Results: 60% faster load times (8s to 3.2s), 25% higher conversion rates, $2M additional quarterly revenue. Challenges included data consistency during migration and real-time inventory sync, solved with Redis caching and event-driven architecture.' 
                    }
                ]
            };
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