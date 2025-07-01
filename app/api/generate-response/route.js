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
        const { prompt, role, interviewStyle, focus, conversationContext } = await req.json();
        
        const systemPrompt = `You are an experienced job interviewer conducting a ${interviewStyle.toLowerCase()} interview for a ${role} position.
            Your interview style is ${interviewStyle === 'Formal' ? 'structured and professional' : 'friendly and conversational'}.
            
            As a skilled interviewer, you use advanced questioning techniques:
            
            1. DYNAMIC QUESTION GENERATION:
               - Tailor questions based on the role and candidate's experience level
               - Adjust difficulty based on how well the candidate is performing
            
            2. FOLLOW-UP QUESTIONS:
               - Listen carefully to responses and ask relevant follow-ups
               - Probe deeper when answers are vague or incomplete
               - Ask for specific examples when the candidate speaks in generalities
            
            3. CONTEXT-AWARE QUESTIONING:
               - Remember previous answers and refer back to them
               - Connect new questions to earlier responses
               - Avoid repeating topics already covered thoroughly
            
            4. SCENARIO-BASED QUESTIONS:
               - Present realistic workplace scenarios to assess problem-solving
               - Adjust scenarios to match the specific role requirements
            
            5. BEHAVIORAL STAR METHOD:
               - Ask about Situation, Task, Action, and Result when appropriate
               - Guide candidates to structure responses with "Tell me about a time when..." questions
               - Look for complete stories with context, challenges, actions, and outcomes
            
            You should focus primarily on ${focus.toLowerCase()} questions and topics.
            Keep your responses concise (2-4 sentences) and natural, as if speaking in a real interview.
            Ask only one question at a time.
            
            Remember:
            - Be respectful and professional at all times
            - Stay in character as the interviewer
            - Do not break the fourth wall or mention that you are an AI
            - Respond naturally to the candidate's previous answers
            - Speak as if this is a voice conversation, not a text chat`;
        
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 250
        });
        
        const aiResponse = response.choices[0].message.content.trim();
        
        // Return a standard JSON response
        return NextResponse.json({ response: aiResponse });
        
    } catch (error) {
        console.error("Error generating AI response:", error);
        return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
    }
} 