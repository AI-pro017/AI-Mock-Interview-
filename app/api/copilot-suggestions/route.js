import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { db } from '@/utils/db';
import { UserProfile, WorkHistory, Education, Certifications } from '@/utils/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Rate limiting and retry configuration - optimized for 500 users
const RATE_LIMIT_CONFIG = {
    maxRetries: 2,
    baseDelay: 500,
    maxDelay: 5000,
};

// Helper function to wait for a specified time
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to calculate exponential backoff delay
const calculateBackoffDelay = (attempt, baseDelay, maxDelay) => {
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    return delay + Math.random() * 500;
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

// Helper function to format session context for AI
function formatSessionContext(sessionContext) {
    if (!sessionContext || sessionContext.length === 0) return '';
    
    let contextText = '\nSESSION CONTEXT (Previous Questions):\n';
    sessionContext.forEach((item, index) => {
        contextText += `${index + 1}. "${item.question}"\n`;
    });
    
    return contextText;
}

// Helper function to check for overlapping topics
function checkTopicOverlap(currentQuestion, sessionContext) {
    if (!sessionContext || sessionContext.length === 0) return null;
    
    const currentLower = currentQuestion.toLowerCase();
    const recentQuestions = sessionContext.slice(-5);
    
    for (const item of recentQuestions) {
        const prevLower = item.question.toLowerCase();
        
        // Check for keyword overlap
        const currentWords = currentLower.split(' ').filter(w => w.length > 3);
        const prevWords = prevLower.split(' ').filter(w => w.length > 3);
        
        const overlap = currentWords.filter(word => prevWords.includes(word));
        
        if (overlap.length >= 2) {
            return item.question;
        }
    }
    
    return null;
}

// Enhanced JSON extraction function
function extractValidJSON(responseText) {
    try {
        // First try direct parsing
        return JSON.parse(responseText);
    } catch (directError) {
        console.log('Direct JSON parse failed, trying extraction methods...');
        
        // Method 1: Find JSON between braces
        try {
            const cleanedResponse = responseText.trim();
            const firstBrace = cleanedResponse.indexOf('{');
            const lastBrace = cleanedResponse.lastIndexOf('}');
            
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                const jsonString = cleanedResponse.substring(firstBrace, lastBrace + 1);
                return JSON.parse(jsonString);
            }
        } catch (braceError) {
            console.log('Brace extraction failed, trying regex method...');
        }
        
        // Method 2: Use regex to find JSON structure
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (regexError) {
            console.log('Regex extraction failed, trying line-by-line method...');
        }
        
        // Method 3: Try to reconstruct JSON from lines
        try {
            const lines = responseText.split('\n');
            let jsonStart = -1;
            let jsonEnd = -1;
            let braceCount = 0;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.includes('{') && jsonStart === -1) {
                    jsonStart = i;
                }
                
                if (jsonStart !== -1) {
                    braceCount += (line.match(/\{/g) || []).length;
                    braceCount -= (line.match(/\}/g) || []).length;
                    
                    if (braceCount === 0) {
                        jsonEnd = i;
                        break;
                    }
                }
            }
            
            if (jsonStart !== -1 && jsonEnd !== -1) {
                const jsonLines = lines.slice(jsonStart, jsonEnd + 1);
                const jsonString = jsonLines.join('\n');
                return JSON.parse(jsonString);
            }
        } catch (lineError) {
            console.log('Line-by-line extraction failed, trying manual reconstruction...');
        }
        
        // Method 4: Try to manually reconstruct basic structure
        try {
            // Look for suggestions array pattern
            const suggestionsMatch = responseText.match(/"suggestions"\s*:\s*\[([\s\S]*?)\]/);
            if (suggestionsMatch) {
                // Try to parse just the suggestions array
                const suggestionsContent = suggestionsMatch[1];
                
                // Extract individual suggestion objects
                const suggestions = [];
                const objectMatches = suggestionsContent.match(/\{[^}]*\}/g);
                
                if (objectMatches) {
                    objectMatches.forEach(objMatch => {
                        try {
                            const obj = JSON.parse(objMatch);
                            if (obj.type && obj.content) {
                                suggestions.push(obj);
                            }
                        } catch (objError) {
                            // Try to manually extract type and content
                            const typeMatch = objMatch.match(/"type"\s*:\s*"([^"]*?)"/);
                            const contentMatch = objMatch.match(/"content"\s*:\s*"([^"]*?)"/);
                            
                            if (typeMatch && contentMatch) {
                                suggestions.push({
                                    type: typeMatch[1],
                                    content: contentMatch[1]
                                });
                            }
                        }
                    });
                }
                
                if (suggestions.length > 0) {
                    return { suggestions };
                }
            }
        } catch (manualError) {
            console.log('Manual reconstruction failed');
        }
        
        // If all methods fail, throw error
        throw new Error('Could not extract valid JSON from response');
    }
}

// Helper function to make OpenAI API call with retry logic
async function makeOpenAICallWithRetry(systemPrompt, userPrompt, maxRetries = RATE_LIMIT_CONFIG.maxRetries) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.3, // Reduced temperature for more consistent JSON
                max_tokens: 800,
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

// Helper function to get fallback suggestions
function getFallbackSuggestions(stage) {
    return stage === 1 ? [
        { 
            type: 'Key Points to Mention', 
            content: 'Core experience, key achievements' 
        },
        { 
            type: '💬 Sample Response', 
            content: 'I successfully handled similar challenges using proven methodologies.' 
        }
    ] : [
        { 
            type: 'Key Points to Mention', 
            content: 'Detailed experience, quantifiable achievements, specific technologies, project outcomes' 
        },
        { 
            type: '💬 Sample Response', 
            content: 'At TechCorp, I led a 6-month platform overhaul as Senior Developer. Our legacy system had 8-second load times causing 40% cart abandonment. I assembled a 4-person team, chose React/Node.js architecture, and implemented microservices with Redis caching. We migrated 75,000 products using automated scripts, integrated Stripe payments, and deployed with zero downtime using blue-green deployment. Key technical challenges included data consistency during migration and real-time inventory sync, which I solved using event-driven architecture and optimistic locking. Results: 60% faster load times (8s to 3.2s), 25% higher conversion rates, $2M additional quarterly revenue. The main optimization was implementing database connection pooling and query optimization, reducing database load by 70%.' 
        }
    ];
}

export async function POST(req) {
    try {
        const { question, history, sessionContext, stage = 1, isFollowUp = false } = await req.json();

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
        const sessionContextText = formatSessionContext(sessionContext);
        const overlappingTopic = checkTopicOverlap(question, sessionContext);

        let systemPrompt, userPrompt;

        if (stage === 1) {
            // Stage 1: Quick, brief response
            systemPrompt = `You are an interview assistant providing QUICK, BRIEF responses for immediate use during interviews.

CRITICAL: You MUST respond with VALID JSON only. No explanations, no markdown, no additional text.

PERFORMANCE CRITICAL: This serves 500+ concurrent users. Response must be:
- INSTANT and BRIEF (1-2 sentences max for sample response)
- Immediately actionable
- Ready to speak without reading

CONTEXT RETENTION: ${isFollowUp ? 'This is a FOLLOW-UP question' : 'This is a NEW question'}
${overlappingTopic ? `RELATED TO: "${overlappingTopic}"` : ''}

RESPOND with brief suggestions in EXACT JSON format:

{
  "suggestions": [
    {
      "type": "Key Points to Mention",
      "content": "[5-8 words max - core highlights only]"
    },
    {
      "type": "💬 Sample Response",
      "content": "[BRIEF 1-2 sentence answer. ${isFollowUp ? 'Build on previous context briefly.' : 'Direct short answer.'} Maximum 25 words. Ready to speak immediately.]"
    }
  ]
}

BEHAVIORAL LOGIC:
${overlappingTopic ? `- Reference previous: "Building on what I mentioned about X..."` : ''}
${isFollowUp ? '- Provide brief elaboration based on context' : '- Give concise, direct answer'}
- Avoid repetition from session context
- Focus on immediate, speakable response

${profileContext ? 'USER PROFILE:\n' + profileContext : ''}
${sessionContextText}`;

        } else {
            // Stage 2: Detailed response with integrated deep dive tips
            systemPrompt = `You are an interview assistant providing DETAILED, COMPREHENSIVE responses with integrated deep insights.

CRITICAL: You MUST respond with VALID JSON only. No explanations, no markdown, no additional text.

CONTEXT RETENTION: Enhance the brief response with comprehensive details
${overlappingTopic ? `BUILDING ON: "${overlappingTopic}"` : ''}

RESPOND with detailed suggestions in EXACT JSON format:

{
  "suggestions": [
    {
      "type": "Key Points to Mention",
      "content": "[10-15 words - comprehensive highlights with specific technical details]"
    },
    {
      "type": "💬 Sample Response",
      "content": "[COMPREHENSIVE detailed response. For technical questions: INCLUDE code examples, edge cases, optimizations, and best practices directly in the response. For behavioral: include full STAR method with metrics. For experience: include specific technologies, challenges, and measurable outcomes. ${isFollowUp ? 'Expand significantly on previous context with new technical depth.' : 'Complete detailed answer with examples and technical insights.'} Integrate deep dive tips naturally into the response. Ready to speak fluently with full context.]"
    }
  ]
}

BEHAVIORAL LOGIC:
${overlappingTopic ? `- Connect deeply to previous topic: "Expanding on our earlier discussion about X, here's the technical depth..."` : ''}
${isFollowUp ? '- Provide comprehensive examples and technical details building on context' : '- Include complete technical context and advanced concepts'}
- Use session history to avoid repetition but add new depth
- For technical questions: Include code examples, performance considerations, edge cases
- For behavioral: Include full situation, metrics, and lessons learned
- For experience: Include specific technologies, architecture decisions, and business impact

STRUCTURE SELECTION & INTEGRATION:
- Experience: Describe → Explain → Highlight Achievements (with specific metrics)
- Comparison: Define → Compare → Demonstrate with Code → Performance Analysis
- Concept: Define → Explain → Show with Code → Best Practices & Edge Cases
- Behavioral: Context → Action → Results → Lessons Learned
- Problem-solving: Problem → Solution → Implementation → Optimization

IMPORTANT FOR TECHNICAL QUESTIONS:
- Always include working code examples in the sample response
- Add performance considerations and optimization tips
- Mention edge cases and how to handle them
- Include best practices and common pitfalls
- Integrate all deep dive insights naturally into the main response

${profileContext ? 'USER PROFILE:\n' + profileContext : ''}
${sessionContextText}`;
        }

        userPrompt = `Current Question: "${question}"

Recent Conversation:
${formattedHistory}

${isFollowUp ? 'This is a follow-up question - provide context-aware response.' : 'This is a new question - provide fresh perspective.'}

Generate ${stage === 1 ? 'brief, immediate' : 'detailed, comprehensive'} interview suggestions in the exact JSON format specified. Return ONLY valid JSON.`;

        const aiResponse = await makeOpenAICallWithRetry(systemPrompt, userPrompt);
        
        // Enhanced JSON parsing with detailed error logging
        let parsedResponse;
        try {
            parsedResponse = extractValidJSON(aiResponse);
            console.log('Successfully parsed AI response');
        } catch (extractError) {
            console.error('JSON extraction failed:', {
                error: extractError.message,
                stage: stage,
                question: question.substring(0, 100),
                responsePreview: aiResponse.substring(0, 200),
                responseLength: aiResponse.length
            });
            
            // Use fallback suggestions
            const fallbackSuggestions = getFallbackSuggestions(stage);
            console.log('Using fallback suggestions for stage:', stage);
                return NextResponse.json({ suggestions: fallbackSuggestions });
        }

        // Validate response structure
        if (!parsedResponse || !parsedResponse.suggestions || !Array.isArray(parsedResponse.suggestions)) {
            console.error('Invalid response structure:', {
                hasResponse: !!parsedResponse,
                hasSuggestions: !!parsedResponse?.suggestions,
                isArray: Array.isArray(parsedResponse?.suggestions),
                stage: stage
            });
            
            const fallbackSuggestions = getFallbackSuggestions(stage);
            parsedResponse = { suggestions: fallbackSuggestions };
        }

        // Validate individual suggestions
        const validSuggestions = parsedResponse.suggestions.filter(s => 
            s && typeof s === 'object' && s.type && s.content
        );

        if (validSuggestions.length === 0) {
            console.error('No valid suggestions found, using fallback');
            const fallbackSuggestions = getFallbackSuggestions(stage);
            return NextResponse.json({ suggestions: fallbackSuggestions });
        }

        return NextResponse.json({ suggestions: validSuggestions });

    } catch (error) {
        console.error(`Error in copilot suggestions (Stage ${stage || 1}):`, error);
        
        // Fast error responses for high-load scenarios
        if (error.status === 429) {
            return NextResponse.json({ 
                error: 'High traffic detected. Please wait briefly.' 
            }, { status: 429 });
        } else if (error.status >= 500) {
            return NextResponse.json({ 
                error: 'AI service temporarily busy. Retrying...' 
            }, { status: 502 });
        } else if (error.status === 401) {
            return NextResponse.json({ 
                error: 'Authentication error.' 
            }, { status: 500 });
        } else {
            return NextResponse.json({ 
                error: 'Unable to generate suggestions. Please try again.' 
            }, { status: 500 });
        }
    }
} 