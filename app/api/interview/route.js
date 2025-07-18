export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { auth } from "@/auth";
import { db } from "@/utils/db";
import { MockInterview } from "@/utils/schema";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { eq } from 'drizzle-orm';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { 
            jobRole, jobDescription, jobExperience, industry, skills, 
            difficulty, focus, duration, interviewStyle, interviewMode 
        } = body;

        if (!jobRole || !jobExperience) {
            return NextResponse.json({ error: 'Job role and experience are required' }, { status: 400 });
        }

        // Check subscription limits (with fallback for users without subscriptions)
        let subscriptionInfo = null;
        try {
            const { SubscriptionService } = await import('@/utils/subscriptionService');
            const subscriptionCheck = await SubscriptionService.canStartSession(session.user.id, 'mock_interview');
            
            if (!subscriptionCheck.canStart) {
                return NextResponse.json({ 
                    error: 'Subscription limit reached',
                    reason: subscriptionCheck.reason,
                    upgradeRequired: true
                }, { status: 403 });
            }
            
            subscriptionInfo = subscriptionCheck;
            
            // Check duration limits based on subscription
            const maxDuration = subscriptionCheck.subscription?.plan?.mockSessionDuration;
            if (maxDuration && duration > maxDuration) {
                return NextResponse.json({ 
                    error: `Duration exceeds plan limit of ${maxDuration} minutes`,
                    maxDuration,
                    upgradeRequired: true
                }, { status: 403 });
            }
        } catch (error) {
            console.log('Subscription service not available, allowing interview creation');
            // If subscription service fails, allow interview creation (fallback to free tier)
            subscriptionInfo = {
                allowed: true,
                subscription: {
                    plan: {
                        displayName: 'Free',
                        mockSessionsLimit: 2,
                        mockSessionDuration: 10
                    }
                },
                usage: {
                    mock_interview: { count: 0, totalDuration: 0 }
                }
            };
        }

        const toolSchema = {
            type: "function",
            function: {
                name: "generate_interview_questions",
                description: "Generates a list of interview questions.",
                parameters: {
                    type: "object",
                    properties: {
                        questions: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    question: { type: "string" },
                                    answer: { type: "string" }
                                },
                                required: ["question", "answer"]
                            }
                        }
                    },
                    required: ["questions"]
                }
            }
        };

        const prompt = `Generate ${difficulty} level interview questions for a ${jobRole} position with ${jobExperience} years of experience. 
        
        Job Description: ${jobDescription}
        Industry: ${industry}
        Required Skills: ${skills}
        Interview Focus: ${focus}
        Interview Style: ${interviewStyle}
        Interview Mode: ${interviewMode}
        
        Generate 5-7 relevant questions with detailed expected answers.`;

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are an expert interview coach. Generate relevant interview questions with comprehensive answers."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            tools: [toolSchema],
            tool_choice: { type: "function", function: { name: "generate_interview_questions" } }
        });

        const toolCall = response.choices[0].message.tool_calls[0];
        const questions = JSON.parse(toolCall.function.arguments).questions;

        const mockId = uuidv4();

        const result = await db.insert(MockInterview).values({
            mockId: mockId,
            jobPosition: jobRole,
            jobDesc: jobDescription,
            jobExperience: jobExperience,
            industry: industry,
            skills: skills,
            difficulty: difficulty,
            focus: focus,
            duration: duration,
            interviewStyle: interviewStyle,
            interviewMode: interviewMode,
            createdBy: session.user.email,
            createdAt: new Date().toISOString(),
        });

        // ✅ REMOVED: Don't track usage here - only track when user actually starts the interview
        console.log('✅ Interview created (not tracked yet):', mockId);

        return NextResponse.json({
            mockId: mockId,
            questions: questions,
            subscription: subscriptionInfo ? {
                plan: subscriptionInfo.subscription?.plan?.displayName || 'Free',
                usage: subscriptionInfo.usage || { mock_interview: { count: 0, totalDuration: 0 } },
                limits: {
                    mockSessions: subscriptionInfo.subscription?.plan?.mockSessionsLimit || 2,
                    duration: subscriptionInfo.subscription?.plan?.mockSessionDuration || 10
                }
            } : null
        });

    } catch (error) {
        console.error('Error creating interview:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(req) {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
        return NextResponse.json({ error: 'Interview ID is required' }, { status: 400 });
    }
    
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const interview = await db.select()
            .from(MockInterview)
            .where(eq(MockInterview.mockId, id))
            .limit(1);
            
        if (interview.length === 0) {
            return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
        }
        
        return NextResponse.json(interview[0]);
    } catch (error) {
        console.error("Error fetching interview:", error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}