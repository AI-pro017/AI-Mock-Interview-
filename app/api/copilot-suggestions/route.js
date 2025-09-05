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
            type: '💡 AI Suggestion', 
            content: 'I have experience with similar challenges and can discuss specific methodologies and outcomes that demonstrate my problem-solving capabilities and technical expertise.',
            hasMore: true
        }
    ] : [
        { 
            type: '💡 AI Suggestion', 
            content: `**Technical Skills & Experience**
• Proficiency in multiple programming languages and frameworks
• Experience with cloud platforms and DevOps practices  
• Database design and optimization expertise
• API development and system integration skills

**Technical Details**
• Definition: Ordered, mutable collection; allows duplicates & mixed data types
• Indexing & Slicing: Access by index, get sublists with bracket notation
• Common Methods: append(), pop(), sort(), extend(), remove()
• List Comprehensions: Compact, readable transformations
• Performance: Backed by dynamic arrays; fast for append/iteration

**Code Examples**
Definition:
my_list = [1, "hello", 3.5, True]

Indexing & Slicing:
my_list[0]  # 1
my_list[-1]  # True  
my_list[1:3]  # ['hello', 3.5]

Common Methods:
nums = [5, 2, 9]
nums.append(7)  # [5, 2, 9, 7]
nums.pop()  # removes last
nums.sort()  # [2, 5, 7, 9]

List Comprehension:
squares = [x**2 for x in range(5)]  # [0,1,4,9,16]

Nested & Flattening:
nested = [[1,2],[3,4]]
flat = [x for row in nested for x in row]  # [1,2,3,4]`,
            hasMore: false
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
            // Stage 1: Consolidated, comprehensive response
            systemPrompt = `You are an interview assistant providing CONSOLIDATED, comprehensive responses that focus on the typical role and give consolidated suggestions.

CRITICAL: You MUST respond with VALID JSON only. No explanations, no markdown, no additional text.

NEW FORMAT: Do NOT include "Key Points To Mention" - provide only a single consolidated suggestion that focuses on the typical role requirements and gives a comprehensive answer.

CONTEXT RETENTION: ${isFollowUp ? 'This is a FOLLOW-UP question' : 'This is a NEW question'}
${overlappingTopic ? `RELATED TO: "${overlappingTopic}"` : ''}

RESPOND with consolidated suggestion in EXACT JSON format:

{
  "suggestions": [
    {
      "type": "💡 AI Suggestion",
      "content": "[Provide a comprehensive, consolidated response that focuses on the typical role and requirements. For example, if asked about data engineer experience, focus on typical data engineer responsibilities like cloud-based data pipelines, Azure Databricks, PySpark, Delta Lake architecture, CDC logic, etc. Make it conversational and ready to speak, around 3-4 sentences that cover the main aspects of the role.]",
      "hasMore": true
    }
  ]
}

BEHAVIORAL LOGIC:
${overlappingTopic ? `- Reference previous: "Building on what I mentioned about X..."` : ''}
${isFollowUp ? '- Provide elaboration based on context while staying consolidated' : '- Give comprehensive but consolidated answer focusing on typical role aspects'}
- Focus on typical role responsibilities and requirements
- Make it conversational and natural
- Around 3-4 sentences covering main role aspects
- Always set hasMore: true for stage 1

${profileContext ? 'USER PROFILE:\n' + profileContext : ''}
${sessionContextText}`;

        } else {
            // Stage 2: Detailed response with organized sections and code examples
            systemPrompt = `You are an interview assistant providing DETAILED, STRUCTURED responses with key points, code examples, and deep insights.

CRITICAL: You MUST respond with VALID JSON only. No explanations, no markdown, no additional text.

NEW FORMAT: Provide a structured detailed response with organized sections using bullet points and code examples when relevant.

CONTEXT RETENTION: Enhance the consolidated response with comprehensive details
${overlappingTopic ? `BUILDING ON: "${overlappingTopic}"` : ''}

RESPOND with detailed suggestion in EXACT JSON format:

{
  "suggestions": [
    {
      "type": "💡 AI Suggestion",
      "content": "Provide a structured detailed response with organized sections. Start directly with the content - do NOT include any instruction text or formatting examples. Use this structure:\n\n**Topic Key Points**\n• Point 1 with specific details\n• Point 2 with technical specifics\n• Point 3 with practical applications\n\n**Technical Details** (if applicable)\n• Definition and core concepts\n• Common methods and approaches\n• Performance considerations\n• Best practices and pitfalls\n\n**Code Examples** (if applicable)\nExample 1:\ncode_here\n\nExample 2:\ncode_here\n\nFor non-technical questions, structure with relevant sections like Experience Details, Methodologies, Results/Metrics, etc. IMPORTANT: Start your response directly with the first section header - do not include any meta-instructions or formatting notes in your actual response.",
      "hasMore": false
    }
  ]
}

BEHAVIORAL LOGIC:
${overlappingTopic ? `- Connect deeply to previous topic: "Expanding on our earlier discussion about X, here's the technical depth..."` : ''}
${isFollowUp ? '- Provide comprehensive examples and technical details building on context' : '- Include complete technical context and advanced concepts'}
- Use session history to avoid repetition but add new depth
- Always structure with clear sections using **bold headers** and bullet points
- For technical questions: Include code examples, performance considerations, edge cases
- For behavioral: Include full situation, metrics, and lessons learned
- For experience: Include specific technologies, architecture decisions, and business impact
- Always set hasMore: false for stage 2

CRITICAL: Your response must start directly with the first section header (e.g., "**Topic Key Points**"). Do NOT include any meta-instructions, formatting examples, or bracketed text like "[STRUCTURED DETAILED RESPONSE...]" in your actual response. Jump straight to the content.

STRUCTURE SELECTION & INTEGRATION:
- Technical Topics: Key Points → Technical Details → Code Examples
- Experience: Key Points → Experience Details → Technologies/Results
- Behavioral: Key Points → Situation/Action → Results/Lessons
- Comparison: Key Points → Definitions → Comparisons → Examples

IMPORTANT FOR TECHNICAL QUESTIONS:
- Always include working code examples with proper syntax
- Add performance considerations and optimization tips
- Mention edge cases and how to handle them
- Include best practices and common pitfalls
- Structure everything clearly with headers and bullet points

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