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
        Your task is to provide three brief, actionable suggestions.

        1. **Key Point to Mention**: A core idea, skill, or experience the user should include in their answer. Start with "Focus on...".
        2. **Smart Question to Ask**: A thoughtful follow-up question the user could ask to show engagement or clarify the interviewer's question. Start with "Consider asking...".
        3. **Direct Answer Hints**: A specific, direct response or phrase the user could use to start their answer. Start with "You could say..." or "Try starting with...".
        
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
            max_tokens: 200,
        });

        const aiResponse = response.choices[0].message.content.trim();
        
        const suggestions = aiResponse.split('\n').map(line => {
            const cleanLine = line.trim();
            if (!cleanLine) return null;

            if (cleanLine.toLowerCase().includes('focus on')) {
                // Remove any numbering, asterisks, and "Key Point to Mention" labels
                const content = cleanLine
                    .replace(/^\d+\.\s*/, '') // Remove numbering like "1. "
                    .replace(/\*\*Key Point to Mention\*\*:?\s*/i, '') // Remove "**Key Point to Mention**:"
                    .replace(/Key Point to Mention:?\s*/i, '') // Remove "Key Point to Mention:"
                    .replace(/^\*+/, '') // Remove leading asterisks
                    .replace(/\*+$/, '') // Remove trailing asterisks
                    .trim();
                return { type: 'Key Point to Mention', content };
            }
            if (cleanLine.toLowerCase().includes('consider asking')) {
                const content = cleanLine
                    .replace(/^\d+\.\s*/, '')
                    .replace(/\*\*Smart Question to Ask\*\*:?\s*/i, '')
                    .replace(/Smart Question to Ask:?\s*/i, '')
                    .replace(/^\*+/, '')
                    .replace(/\*+$/, '')
                    .trim();
                return { type: 'Smart Question to Ask', content };
            }
            if (cleanLine.toLowerCase().includes('you could say') || cleanLine.toLowerCase().includes('try starting with')) {
                const content = cleanLine
                    .replace(/^\d+\.\s*/, '')
                    .replace(/\*\*Direct Answer Hints\*\*:?\s*/i, '')
                    .replace(/Direct Answer Hints:?\s*/i, '')
                    .replace(/^\*+/, '')
                    .replace(/\*+$/, '')
                    .trim();
                return { type: 'Direct Answer Hints', content };
            }
            return null;
        }).filter(Boolean);

        return NextResponse.json({ suggestions });

    } catch (error) {
        console.error("Error in copilot suggestions:", error);
        return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
    }
} 