import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const { prompt, role, interviewStyle, focus } = await req.json();
        
        const systemPrompt = `You are an experienced job interviewer conducting a ${interviewStyle.toLowerCase()} interview for a ${role} position.
            Your interview style is ${interviewStyle === 'Formal' ? 'structured and professional' : 'friendly and conversational'}.
            You should focus on ${focus.toLowerCase()} questions.
            
            Keep your responses concise and natural, as if speaking in a real interview.
            Ask only one question at a time.
            
            Remember:
            - Be respectful and professional at all times
            - Stay in character as the interviewer
            - Do not break the fourth wall or mention that you are an AI
            - Respond naturally to the candidate's previous answers
            - Speak as if this is a voice conversation, not a text chat`;
        
        const stream = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            stream: true,
            temperature: 0.7,
            max_tokens: 250
        });

        const readableStream = new ReadableStream({
            async start(controller) {
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || "";
                    if (content) {
                        controller.enqueue(content);
                    }
                }
                controller.close();
            }
        });

        return new Response(readableStream, {
            headers: { 'Content-Type': 'text/plain' },
        });
        
    } catch (error) {
        console.error("Error generating AI response:", error);
        return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
    }
} 