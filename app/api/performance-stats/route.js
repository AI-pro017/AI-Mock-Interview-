import { NextResponse } from 'next/server';
import { db } from '@/utils/db';
import { InterviewReport, MockInterview } from '@/utils/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { auth } from '@/auth';
import OpenAI from 'openai';

// Tell Next.js this is a dynamic route that shouldn't be statically optimized
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(req) {
  try {
    console.log('Performance stats API called');
    
    // Get the session
    const session = await auth();
    
    // Check authentication
    if (!session || !session.user || !session.user.id) {
      console.log('Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const userEmail = session.user.email;
    console.log('User email:', userEmail);
    
    // Get interviews created by the user
    const interviews = await db.select({
      id: MockInterview.id,
      mockId: MockInterview.mockId,
      createdAt: MockInterview.createdAt
    })
    .from(MockInterview)
    .where(eq(MockInterview.createdBy, userEmail))
    .orderBy(desc(MockInterview.id));
    
    console.log('Found interviews:', interviews.length);
    
    if (interviews.length === 0) {
      return NextResponse.json({
        topScore: 0,
        averageScore: 0,
        performanceTrend: 'No data',
        topStrength: 'No data yet',
        focusArea: 'Complete your first interview',
        totalInterviews: 0,
        completedInterviews: 0,
        recentActivity: false,
        skillBreakdown: {
          'Communication': 0,
          'Technical': 0,
          'Problem Solving': 0
        },
        improvementAreas: []
      });
    }
    
    // Fetch all interview reports for this user using the user's ID
    const mockIds = interviews.map(interview => interview.mockId);
    const reports = await db
      .select()
      .from(InterviewReport)
      .where(eq(InterviewReport.userId, userId));
    
    console.log('Found reports:', reports.length);
    
    if (reports.length === 0) {
      return NextResponse.json({
        topScore: 0,
        averageScore: 0,
        performanceTrend: 'No data',
        topStrength: 'No data yet',
        focusArea: 'Complete your first interview',
        totalInterviews: interviews.length,
        completedInterviews: 0,
        recentActivity: interviews.length > 0,
        skillBreakdown: {
          'Communication': 0,
          'Technical': 0,
          'Problem Solving': 0
        },
        improvementAreas: []
      });
    }
    
    // Calculate top and average scores
    const scores = reports.map(report => report.overallScore).filter(score => score !== null);
    const topScore = Math.max(...scores);
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    
    // Get the most recent reports for trend analysis (last 3)
    const recentReports = reports.slice(-3);
    
    // Use OpenAI to analyze the reports
    const analysisPrompt = `
    I have data from ${reports.length} interview reports. Please analyze the following information and provide concise results:
    
    1. Performance Trend (one word like "Improving", "Steady", "Declining"):
    ${recentReports.map(r => `- Score: ${r.overallScore}`).join('\n')}
    
    2. Top Strength (one or two words max, like "Communication", "Problem Solving", "Technical Knowledge"):
    ${reports.map(r => `- Strengths: ${r.strengths}`).join('\n')}
    
    3. Focus Area (one short phrase, max 8 words):
    ${reports.map(r => `- Improvement Plan: ${r.improvementPlan}`).join('\n')}
    
    4. Skill Breakdown (provide scores from 1-10 for each):
    Communication: ?/10
    Technical: ?/10
    Problem Solving: ?/10
    
    Base these scores on the strengths and weaknesses mentioned.
    
    Return the response as a JSON object with the following structure:
    {
      "performanceTrend": "...",
      "topStrength": "...",
      "focusArea": "...",
      "skillBreakdown": {
        "Communication": x,
        "Technical": y,
        "Problem Solving": z
      }
    }
    `;
    
    let analysisResult;
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-1106",
        messages: [
          {
            role: "system",
            content: "You are an expert interview performance analyzer. Provide concise, direct responses."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 300,
      });
      
      analysisResult = JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error in OpenAI analysis:', error);
      // Fallback values if OpenAI fails
      analysisResult = {
        performanceTrend: reports.length > 1 ? "Improving" : "No trend",
        topStrength: "Communication",
        focusArea: "Practice structured responses using the STAR method",
        skillBreakdown: {
          'Communication': 0,
          'Technical': 0,
          'Problem Solving': 0
        }
      };
    }

    console.log(analysisResult);
    
    // Extract improvement areas from the most recent report
    const improvementAreas = reports[reports.length - 1].improvementPlan
      ?.split('\n')
      .filter(item => item.trim().length > 0)
      .map(item => item.replace(/^\d+\.\s*/, '').trim())
      .slice(0, 3) || [];
    
    return NextResponse.json({
      topScore,
      averageScore,
      performanceTrend: analysisResult.performanceTrend,
      topStrength: analysisResult.topStrength,
      focusArea: analysisResult.focusArea,
      totalInterviews: interviews.length,
      completedInterviews: reports.length,
      recentActivity: reports.length > 0,
      skillBreakdown: analysisResult.skillBreakdown,
      improvementAreas
    });
    
  } catch (error) {
    console.error('Error in performance stats API:', error);
    return NextResponse.json({
      error: 'An error occurred fetching performance data',
      message: error.message
    }, { status: 500 });
  }
}
