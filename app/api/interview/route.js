import { auth } from "@/app/api/auth/[...auth]/route";
import { db } from "@/utils/db";
import { MockInterview } from "@/utils/schema";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from 'uuid';

export async function POST(req) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { 
            jobRole, jobDescription, jobExperience, industry, skills, 
            difficulty, focus, duration, interviewStyle, interviewMode 
        } = body;

        // Basic validation
        if (!jobRole || !jobExperience) {
            return NextResponse.json({ error: 'Job role and experience are required' }, { status: 400 });
        }
        
        const interviewId = uuidv4(); 

        // Insert all the new data into the database
        await db.insert(MockInterview).values({
            mockId: interviewId,
            jobPosition: jobRole,
            jobDesc: jobDescription || `AI generated for ${jobRole}`,
            jobExperience: jobExperience.toString(),
            industry: industry || '',
            skills: skills || '',
            difficulty: difficulty,
            focus: focus,
            duration: duration,
            interviewStyle: interviewStyle,
            interviewMode: interviewMode,
            createdBy: session.user.email,
            createdAt: new Date().toISOString(),
        });
        
        return NextResponse.json({ success: true, interviewId });

    } catch (error) {
        console.error("Error creating interview:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
} 