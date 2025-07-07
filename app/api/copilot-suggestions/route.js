import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
    try {
        const { question, history } = await req.json();

        if (!question) {
            return NextResponse.json({ error: 'Question is required' }, { status: 400 });
        }

        const formattedHistory = (history || [])
            .map(turn => `${turn.speaker}: ${turn.text}`)
            .join('\n');

        const systemPrompt = `You are an expert interview coach providing real-time, concise advice. A user is in a live interview.
        You will be given the conversation history and the latest question from the interviewer.
        Your task is to provide two brief, actionable suggestions.

        1.  **Key Point to Mention**: A core idea, skill, or experience the user should include in their answer. Start with "Focus on...".
        2.  **Smart Question to Ask**: A thoughtful follow-up question the user could ask to show engagement or clarify the interviewer's question. Start with "Consider asking...".
        
        Keep your suggestions extremely brief (10-15 words max). The user needs to glance at them during a live conversation.
        Base your suggestions on the provided conversation history to avoid being generic.`;

        const userPrompt = `
        CONVERSATION HISTORY:
        ${formattedHistory}

        LATEST QUESTION FROM INTERVIEWER:
        "${question}"

        Your concise suggestions:
        `;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.6,
            max_tokens: 150,
        });

        const aiResponse = response.choices[0].message.content.trim();
        
        const suggestions = aiResponse.split('\n').map(line => {
            if (line.toLowerCase().includes('focus on')) {
                return { type: 'Key Point to Mention', content: line };
            }
            if (line.toLowerCase().includes('consider asking')) {
                return { type: 'Smart Question to Ask', content: line };
            }
            return null;
        }).filter(Boolean);

        return NextResponse.json({ suggestions });

    } catch (error) {
        console.error("Error in copilot suggestions:", error);
        return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
    }
} 