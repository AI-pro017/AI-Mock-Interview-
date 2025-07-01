// app/api/interview-analysis/route.js
console.log("API ROUTE LOADED: /api/interview-analysis");

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
    console.log("### FEEDBACK ANALYSIS: API endpoint called ###");
    
    // Authentication check
    const session = await auth();
    if (!session?.user?.id) {
        console.log("### FEEDBACK ANALYSIS: Authentication failed - No user session ###");
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log("### FEEDBACK ANALYSIS: Authentication successful ###");

    try {
        // Parse request body
        const body = await req.json();
        const { mockId } = body;
        console.log(`### FEEDBACK ANALYSIS: Processing mockId: ${mockId} ###`);

        if (!mockId) {
            console.log("### FEEDBACK ANALYSIS: Missing mockId in request ###");
            return NextResponse.json({ error: 'Mock ID is required' }, { status: 400 });
        }

        // Check for existing report
        console.log("### FEEDBACK ANALYSIS: Checking for existing report ###");
        const existingReport = await db.select().from(InterviewReport).where(eq(InterviewReport.mockIdRef, mockId));
        
        if (existingReport.length > 0) {
            console.log("### FEEDBACK ANALYSIS: Report already exists, returning success ###");
            return NextResponse.json({ message: 'Report already exists.' });
        }

        // Fetch answers
        console.log("### FEEDBACK ANALYSIS: Fetching user answers ###");
        console.log(`### FEEDBACK ANALYSIS: UserAnswer schema check: mockIdRef field exists = ${!!UserAnswer.mockIdRef} ###`);
        
        // Debugging the database query
        try {
            const userAnswers = await db.select()
                .from(UserAnswer)
                .where(eq(UserAnswer.mockIdRef, mockId));
            
            console.log(`### FEEDBACK ANALYSIS: Found ${userAnswers.length} answers ###`);
            
            // Debug first few answers if they exist
            if (userAnswers.length > 0) {
                console.log("### FEEDBACK ANALYSIS: First answer sample ###", {
                    id: userAnswers[0].id,
                    question: userAnswers[0].question,
                    hasUserAns: !!userAnswers[0].userAns,
                    mockIdRef: userAnswers[0].mockIdRef
                });
            } else {
                console.log("### FEEDBACK ANALYSIS: No answers found, returning 404 ###");
                return NextResponse.json({ error: 'No answers found for this interview' }, { status: 404 });
            }

            // Construct analysis prompt
            console.log("### FEEDBACK ANALYSIS: Constructing analysis prompt ###");
            const analysisPrompt = createAnalysisPrompt(userAnswers);
            console.log(`### FEEDBACK ANALYSIS: Prompt created with length ${analysisPrompt.length} ###`);

            // Call OpenAI
            console.log("### FEEDBACK ANALYSIS: Calling OpenAI API ###");
            console.log(`### FEEDBACK ANALYSIS: OpenAI API key check: ${!!process.env.OPENAI_API_KEY ? "API key exists" : "No API key"} ###`);
            
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

                console.log("### FEEDBACK ANALYSIS: OpenAI response received ###");
                
                // Parse response
                console.log("### FEEDBACK ANALYSIS: Parsing OpenAI response ###");
                let analysisResult;
                try {
                    analysisResult = JSON.parse(response.choices[0].message.content);
                    console.log("### FEEDBACK ANALYSIS: Response successfully parsed ###");
                    console.log("### FEEDBACK ANALYSIS: Response structure check ###", {
                        hasDetailedAnalysis: !!analysisResult.detailedAnalysis,
                        detailedAnalysisIsArray: Array.isArray(analysisResult.detailedAnalysis),
                        hasOverallSummary: !!analysisResult.overallSummary
                    });
                } catch (parseError) {
                    console.log(`### FEEDBACK ANALYSIS: Error parsing response: ${parseError.message} ###`);
                    console.log("### FEEDBACK ANALYSIS: Raw response preview ###", 
                        response.choices[0].message.content.substring(0, 200) + "...");
                    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
                }

                // Validate response
                if (!analysisResult.detailedAnalysis || !Array.isArray(analysisResult.detailedAnalysis) || 
                    !analysisResult.overallSummary) {
                    console.log("### FEEDBACK ANALYSIS: Invalid response structure ###");
                    return NextResponse.json({ error: 'Invalid analysis structure' }, { status: 500 });
                }

                // Update answers with feedback
                console.log(`### FEEDBACK ANALYSIS: Updating ${analysisResult.detailedAnalysis.length} answers with feedback ###`);
                
                let updateSuccessCount = 0;
                for (const item of analysisResult.detailedAnalysis) {
                    if (!item.userAnswerId) {
                        console.log("### FEEDBACK ANALYSIS: Missing userAnswerId in item ###");
                        continue;
                    }
                    
                    console.log(`### FEEDBACK ANALYSIS: Updating answer ID: ${item.userAnswerId} ###`);
                    try {
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
                        updateSuccessCount++;
                    } catch (updateError) {
                        console.log(`### FEEDBACK ANALYSIS: Error updating answer: ${updateError.message} ###`);
                    }
                }
                console.log(`### FEEDBACK ANALYSIS: Successfully updated ${updateSuccessCount} answers ###`);

                // Create report
                console.log("### FEEDBACK ANALYSIS: Creating interview report ###");
                try {
                    await db.insert(InterviewReport).values({
                        mockIdRef: mockId,
                        userId: session.user.id,
                        overallScore: analysisResult.overallSummary.overallScore || 70,
                        strengths: analysisResult.overallSummary.strengths || "Analysis did not provide strengths.",
                        weaknesses: analysisResult.overallSummary.weaknesses || "Analysis did not provide weaknesses.",
                        improvementPlan: analysisResult.overallSummary.improvementPlan || "Focus on improving your interview skills.",
                    });
                    console.log("### FEEDBACK ANALYSIS: Report successfully created ###");
                } catch (reportError) {
                    console.log(`### FEEDBACK ANALYSIS: Error creating report: ${reportError.message} ###`);
                    return NextResponse.json({ error: 'Error creating interview report' }, { status: 500 });
                }

                console.log("### FEEDBACK ANALYSIS: Analysis complete and successful ###");
                return NextResponse.json({ message: 'Analysis complete and feedback stored.' });
                
            } catch (openaiError) {
                console.log(`### FEEDBACK ANALYSIS: OpenAI API error: ${openaiError.message} ###`);
                return NextResponse.json({ error: 'Error communicating with AI service' }, { status: 503 });
            }
        } catch (dbError) {
            console.log(`### FEEDBACK ANALYSIS: Database query error: ${dbError.message} ###`);
            return NextResponse.json({ error: 'Database error: ' + dbError.message }, { status: 500 });
        }
    } catch (error) {
        console.log(`### FEEDBACK ANALYSIS: Unhandled error: ${error.message} ###`);
        return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
    }
}

function createAnalysisPrompt(userAnswers) {
    console.log("### FEEDBACK ANALYSIS: Creating analysis prompt ###");
    
    const questionsAndAnswers = userAnswers.map(ua => ({
        userAnswerId: ua.id,
        question: ua.question,
        userAnswer: ua.userAns,
    }));
    
    console.log(`### FEEDBACK ANALYSIS: Mapped ${questionsAndAnswers.length} Q&A pairs ###`);
    if (questionsAndAnswers.length > 0) {
        console.log("### FEEDBACK ANALYSIS: First Q&A sample ###", {
            id: questionsAndAnswers[0].userAnswerId,
            hasQuestion: !!questionsAndAnswers[0].question,
            hasAnswer: !!questionsAndAnswers[0].userAnswer
        });
    }

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