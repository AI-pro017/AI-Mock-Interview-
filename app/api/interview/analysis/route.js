import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/utils/db';
import { UserAnswer, InterviewReport } from '@/utils/schema';
import { eq } from 'drizzle-orm';
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
        const { mockId } = await req.json();

        if (!mockId) {
            return NextResponse.json({ error: 'Mock ID is required' }, { status: 400 });
        }

        // New: Check if a report already exists
        const existingReport = await db.select().from(InterviewReport).where(eq(InterviewReport.mockIdRef, mockId));
        if (existingReport.length > 0) {
            console.log("Report already exists for mockId:", mockId);
            return NextResponse.json({ message: 'Report already exists.' });
        }

        console.log("Generating new report for mockId:", mockId);
        
        // 1. Fetch all user answers for the interview
        const userAnswers = await db.select()
            .from(UserAnswer)
            .where(eq(UserAnswer.mockIdRef, mockId));

        console.log(`Found ${userAnswers.length} answers for mockId:`, mockId);
        
        if (userAnswers.length === 0) {
            return NextResponse.json({ error: 'No answers found for this interview' }, { status: 404 });
        }

        // 2. Construct a prompt for the AI to analyze the entire interview
        const analysisPrompt = createAnalysisPrompt(userAnswers);

        console.log("Sending request to OpenAI...");
        // 3. Get the analysis from OpenAI
        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert interview coach. Analyze the following interview performance based on the user's answers. Provide a detailed analysis for each question and an overall summary. The output should be a JSON object."
                    },
                    {
                        role: "user",
                        content: analysisPrompt
                    }
                ],
                response_format: { type: "json_object" },
            });

            console.log("Received response from OpenAI");
            
            // Safely parse the response
            let analysisResult;
            try {
                analysisResult = JSON.parse(response.choices[0].message.content);
                console.log("Successfully parsed OpenAI response");
            } catch (parseError) {
                console.error("Error parsing OpenAI response:", parseError);
                console.error("Response content:", response.choices[0].message.content);
                return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
            }

            // Validate response structure
            if (!analysisResult.detailedAnalysis || !Array.isArray(analysisResult.detailedAnalysis) || 
                !analysisResult.overallSummary) {
                console.error("Invalid response structure from OpenAI:", analysisResult);
                return NextResponse.json({ error: 'Invalid analysis structure' }, { status: 500 });
            }

            // 4. Update the UserAnswer table with detailed feedback for each question
            console.log("Updating user answers with feedback...");
            for (const item of analysisResult.detailedAnalysis) {
                if (!item.userAnswerId) {
                    console.warn("Missing userAnswerId in item:", item);
                    continue;
                }
                
                await db.update(UserAnswer)
                    .set({
                        feedback: item.feedback || "No specific feedback provided.",
                        rating: (item.rating || "5").toString(),
                        clarityScore: item.clarityScore || 5,
                        paceScore: item.paceScore || 5,
                        fillerWords: item.fillerWords || 0,
                        confidenceScore: item.confidenceScore || 5,
                        technicalScore: item.technicalScore || 5,
                        grammarScore: item.grammarScore || 5,
                    })
                    .where(eq(UserAnswer.id, item.userAnswerId));
            }

            // 5. Create a new record in the InterviewReport table
            console.log("Creating interview report...");
            await db.insert(InterviewReport).values({
                mockIdRef: mockId,
                userId: session.user.id,
                overallScore: analysisResult.overallSummary.overallScore || 70,
                strengths: analysisResult.overallSummary.strengths || "Analysis did not provide strengths.",
                weaknesses: analysisResult.overallSummary.weaknesses || "Analysis did not provide weaknesses.",
                improvementPlan: analysisResult.overallSummary.improvementPlan || "Focus on improving your interview skills.",
            });

            console.log("Analysis and report generation completed successfully");
            return NextResponse.json({ message: 'Analysis complete and feedback stored.' });
            
        } catch (openaiError) {
            console.error("OpenAI API error:", openaiError);
            return NextResponse.json({ error: 'Error communicating with AI service' }, { status: 503 });
        }

    } catch (error) {
        console.error('Error analyzing interview:', error);
        return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
    }
}

function createAnalysisPrompt(userAnswers) {
    const questionsAndAnswers = userAnswers.map(ua => ({
        userAnswerId: ua.id,
        question: ua.question,
        userAnswer: ua.userAns,
    }));

    return `
        Please analyze the following interview questions and answers. For each answer, provide:
        - feedback: Detailed feedback on the answer.
        - rating: A rating from 1 to 10.
        - clarityScore: Score from 1-10 for clarity.
        - paceScore: Score from 1-10 for speaking pace.
        - fillerWords: Count of estimated filler words.
        - confidenceScore: Score from 1-10 for confidence.
        - technicalScore: Score from 1-10 for technical accuracy.
        - grammarScore: Score from 1-10 for grammar.

        Also provide an overall summary of the performance including:
        - overallScore: A weighted average score from 1-100.
        - strengths: A summary of the candidate's strengths.
        - weaknesses: A summary of the candidate's weaknesses.
        - improvementPlan: A personalized plan for improvement.

        Return the entire response as a single JSON object with two keys: "detailedAnalysis" (an array of objects, one for each question) and "overallSummary" (an object).

        Here is the interview data:
        ${JSON.stringify(questionsAndAnswers)}
    `;
} 