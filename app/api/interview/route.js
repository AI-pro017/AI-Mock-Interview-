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

        const prompt = `Generate 5 interview questions for a ${jobRole} with ${jobExperience} years of experience.
${jobDescription ? `Job Description: ${jobDescription}` : ''}
The questions should focus on ${focus} aspects and be at a ${difficulty} difficulty level.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            tools: [toolSchema],
            tool_choice: { type: "function", function: { name: "generate_interview_questions" } },
        });
        
        
        const toolCall = response.choices[0].message.tool_calls[0];
        if (!toolCall) {
            throw new Error("[DIAGNOSTIC] CRITICAL: OpenAI response did not include a tool call.");
        }

        const functionArguments = toolCall.function.arguments;
        const parsedResult = JSON.parse(functionArguments);

        if (!parsedResult.questions || parsedResult.questions.length === 0) {
             throw new Error("[DIAGNOSTIC] CRITICAL: AI tool call succeeded but generated no questions.");
        }

        const jsonMockResponse = JSON.stringify(parsedResult.questions);
        const interviewId = uuidv4();
        
        await db.insert(MockInterview).values({
            mockId: interviewId,
            jobPosition: jobRole,
            jobDesc: jsonMockResponse,
            jobExperience: jobExperience.toString(),
            industry: industry || '',
            skills: skills || '',
            difficulty: difficulty || 'Medium',
            focus: focus || 'Behavioral',
            duration: duration || 30,
            interviewStyle: interviewStyle || 'Conversational',
            interviewMode: interviewMode || 'Practice',
            createdBy: session.user.email,
            createdAt: new Date().toISOString(),
        });
        
        return NextResponse.json({ success: true, interviewId });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
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