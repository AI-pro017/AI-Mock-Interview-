// app/api/interview-analysis/route.js
import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/utils/db';
import { UserAnswer, InterviewReport, MockInterview } from '@/utils/schema';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';


const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
    
    // Authentication check - make this optional since we might need to generate feedback
    // even if the user's session has expired
    let userId = "guest";
    try {
        const session = await auth();
        if (session?.user?.id) {
            userId = session.user.id;
        }
    } catch (authError) {
        console.log(authError);
    }

    try {
        // Parse request body
        const body = await req.json();
        const { mockId } = body;

        if (!mockId) {
            return NextResponse.json({ error: 'Mock ID is required' }, { status: 400 });
        }

        // Check for existing report with retry mechanism
        let existingReport = [];
        let retries = 0;
        const maxRetries = 3;
        
        while (retries < maxRetries) {
            try {
                existingReport = await db.select().from(InterviewReport).where(eq(InterviewReport.mockIdRef, mockId));
                break; // Exit the retry loop if successful
            } catch (dbError) {
                retries++;
                if (retries >= maxRetries) throw dbError;
                // Wait with exponential backoff
                await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retries - 1)));
            }
        }
        
        if (existingReport.length > 0) {
            return NextResponse.json({ 
                message: 'Report already exists.',
                success: true,
                reportId: existingReport[0].id
            });
        }

        // Fetch answers with retry
        let userAnswers = [];
        retries = 0;
        
        while (retries < maxRetries) {
            try {
                userAnswers = await db.select()
                    .from(UserAnswer)
                    .where(eq(UserAnswer.mockIdRef, mockId));
                break; // Exit the retry loop if successful
            } catch (dbError) {
                retries++;
                if (retries >= maxRetries) throw dbError;
                await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retries - 1)));
            }
        }
        
        
        // Handle case when no answers are found
        if (userAnswers.length === 0) {
            
            try {
                // Create a default report with placeholder values
                const insertResult = await db.insert(InterviewReport).values({
                    mockIdRef: mockId,
                    userId: userId,
                    overallScore: 0,
                    strengths: "No interview answers were recorded. Please complete an interview to receive feedback.",
                    weaknesses: "Unable to analyze interview performance as no answers were recorded.",
                    improvementPlan: "To get personalized feedback, please complete an interview by answering the questions provided.",
                }).returning({ id: InterviewReport.id });
                
                return NextResponse.json({ 
                    message: 'Default report created because no answers were found.',
                    success: true,
                    reportId: insertResult[0]?.id
                });
            } catch (reportError) {
                return NextResponse.json({ error: 'Failed to create default report' }, { status: 500 });
            }
        }

        // Continue with normal analysis if answers exist
        const analysisPrompt = createAnalysisPrompt(userAnswers);
        
        try {
            // Set a timeout for the OpenAI request to prevent hanging
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('OpenAI request timed out')), 30000));
            
            // Create the OpenAI request
            const openaiPromise = openai.chat.completions.create({
                model: "gpt-3.5-turbo-1106", // Fallback to a more reliable model for feedback
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
                temperature: 0.7,
                max_tokens: 2000,
            });
            
            // Race the promises to implement the timeout
            const response = await Promise.race([openaiPromise, timeoutPromise]);

            
            // Parse response
            let analysisResult;
            try {
                analysisResult = JSON.parse(response.choices[0].message.content);
            } catch (parseError) {
                // Create a fallback analysis
                analysisResult = createFallbackAnalysis(userAnswers);
            }

            // Validate response or use fallback
            if (!analysisResult.detailedAnalysis || !Array.isArray(analysisResult.detailedAnalysis) || 
                !analysisResult.overallSummary) {
                analysisResult = createFallbackAnalysis(userAnswers);
            }

            // Update answers with feedback
            
            for (const item of analysisResult.detailedAnalysis) {
                try {
                    if (!item.userAnswerId) {
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
                } catch (updateError) {
                    // Continue with other updates despite error
                }
            }

            // Create report
            const insertResult = await db.insert(InterviewReport).values({
                mockIdRef: mockId,
                userId: userId,
                overallScore: analysisResult.overallSummary.overallScore || 70,
                strengths: analysisResult.overallSummary.strengths || "Analysis did not provide strengths.",
                weaknesses: analysisResult.overallSummary.weaknesses || "Analysis did not provide weaknesses.",
                improvementPlan: analysisResult.overallSummary.improvementPlan || "Focus on improving your interview skills.",
            }).returning({ id: InterviewReport.id });

            return NextResponse.json({ 
                message: 'Analysis complete and feedback stored.',
                success: true,
                reportId: insertResult[0]?.id
            });
            
        } catch (openaiError) {
            
            // Create fallback report in case of OpenAI failure
            try {
                const fallbackAnalysis = createFallbackAnalysis(userAnswers);
                
                // Update answers with fallback feedback
                for (const item of fallbackAnalysis.detailedAnalysis) {
                    try {
                        await db.update(UserAnswer)
                            .set({
                                feedback: item.feedback,
                                rating: item.rating.toString(),
                                clarityScore: 5,
                                paceScore: 5,
                                fillerWords: 0,
                                confidenceScore: 5,
                                technicalScore: 5,
                                grammarScore: 5,
                            })
                            .where(eq(UserAnswer.id, item.userAnswerId));
                    } catch (updateError) {
                        console.log(`### FEEDBACK ANALYSIS: Error updating answer in fallback ###`, updateError);
                    }
                }
                
                // Create fallback report
                const insertResult = await db.insert(InterviewReport).values({
                    mockIdRef: mockId,
                    userId: userId,
                    overallScore: 70,
                    strengths: fallbackAnalysis.overallSummary.strengths,
                    weaknesses: fallbackAnalysis.overallSummary.weaknesses,
                    improvementPlan: fallbackAnalysis.overallSummary.improvementPlan,
                }).returning({ id: InterviewReport.id });
                
                return NextResponse.json({ 
                    message: 'Fallback analysis created due to AI service issues.',
                    success: true,
                    reportId: insertResult[0]?.id,
                    fallback: true
                });
            } catch (fallbackError) {
                return NextResponse.json({ error: 'Failed to create any report' }, { status: 500 });
            }
        }
    } catch (error) {
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

// Create fallback analysis for when OpenAI fails
function createFallbackAnalysis(userAnswers) {
    
    const detailedAnalysis = userAnswers.map(answer => ({
        userAnswerId: answer.id,
        feedback: "Thank you for your response. Your answer provided some good points. To improve, try to be more specific with examples and structure your thoughts more clearly.",
        rating: 7,
        clarityScore: 5,
        paceScore: 5,
        fillerWords: 0,
        confidenceScore: 5,
        technicalScore: 5,
        grammarScore: 5
    }));
    
    return {
        detailedAnalysis,
        overallSummary: {
            overallScore: 70,
            strengths: "You provided answers to all questions and showed knowledge in the interview topics.",
            weaknesses: "There's room for improvement in providing more structured and detailed responses with specific examples.",
            improvementPlan: "Practice the STAR method (Situation, Task, Action, Result) when answering interview questions. Prepare examples from your experience that showcase your skills. Work on structuring your answers clearly with an introduction, main points, and conclusion."
        }
    };
}