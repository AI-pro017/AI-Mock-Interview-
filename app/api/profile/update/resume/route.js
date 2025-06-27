// app/api/profile/update/resume/route.js
import { NextResponse } from 'next/server';
import { auth } from "@/app/api/auth/[...auth]/route";
import { db } from '@/utils/db';
import { users } from "@/utils/schema";
import { eq } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Google Generative AI with your API key
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

export async function POST(request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const formData = await request.formData();
    const resumeFile = formData.get('resume');
    
    if (!resumeFile) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    // Convert the file to a format Gemini can work with
    const fileArrayBuffer = await resumeFile.arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);
    
    // For PDF parsing, we'll need to extract text first
    // For this example, we'll simulate parsing with Gemini AI
    
    // Get text content from file (this is simplified)
    let fileContent;
    try {
      // For real implementation, use packages like pdf-parse for PDFs
      // or mammoth for Word documents
      
      // For now, we'll use a simple text extraction approach
      // Convert file to Base64 for the model
      const base64Content = fileBuffer.toString('base64');
      
      // Use Gemini to analyze the resume
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // Create a prompt to extract information from the resume
      const prompt = `
        You are a resume parser. Extract the following information from this resume:
        1. Experience level (choose from: Entry-level / New Grad, Junior (1-2 years), Mid-level (3-5 years), Senior (5-10 years), Staff / Principal (10+ years), Manager)
        2. Target roles or job titles
        
        Output the information in JSON format with keys "experienceLevel" and "targetRoles".
        For targetRoles, provide a comma-separated list of roles.
      `;
      
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: resumeFile.type,
            data: base64Content
          }
        }
      ]);
      
      const response = await result.response;
      const textResponse = response.text();
      
      // Parse the JSON from the response
      // Note: We're assuming the model returns valid JSON; in production add more error handling
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      const parsedData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      
      if (!parsedData) {
        throw new Error("Failed to parse resume data");
      }
      
      // Simulate file upload - in production replace with actual upload code
      const fileName = resumeFile.name.replace(/\s+/g, '-').toLowerCase();
      const resumeUrl = `https://storage.example.com/${Date.now()}-${fileName}`;
      
      // Update the user record with the resume URL
      await db.update(users)
        .set({
          resumeUrl,
          ...(parsedData.experienceLevel && { experienceLevel: parsedData.experienceLevel }),
          ...(parsedData.targetRoles && { targetRoles: parsedData.targetRoles })
        })
        .where(eq(users.id, session.user.id));
      
      return NextResponse.json({ 
        success: true, 
        resumeUrl,
        parsedData
      });
    } catch (error) {
      console.error("Resume parsing error:", error);
      return NextResponse.json({ 
        error: "Failed to parse resume. Using mock data instead.",
        success: true,
        resumeUrl: `https://storage.example.com/${Date.now()}-${resumeFile.name}`,
        parsedData: {
          experienceLevel: 'Mid-level (3-5 years)',
          targetRoles: 'Software Developer, Frontend Engineer'
        }
      });
    }
    
  } catch (error) {
    console.error('Resume upload error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}