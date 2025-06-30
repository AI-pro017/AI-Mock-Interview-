import { NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { auth } from "@/app/api/auth/[...auth]/route";
import { db } from "@/utils/db";
import { users } from "@/utils/schema";
import { eq } from "drizzle-orm";

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
    
    console.log("Processing file:", resumeFile.name, resumeFile.type);
    
    // Extract file content
    let fileContent = '';
    try {
      // Convert file to array buffer then to text
      const arrayBuffer = await resumeFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Extract text based on file type
      if (resumeFile.type === 'application/pdf') {
        // For PDFs
        const pdfData = await pdfParse(buffer);
        fileContent = pdfData.text;
        console.log("PDF content extracted successfully");
      } 
      else if (resumeFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // For DOCX files
        const result = await mammoth.extractRawText({ buffer });
        fileContent = result.value;
        console.log("DOCX content extracted successfully");
      } 
      else if (resumeFile.type === 'application/msword') {
        // For DOC files - older format
        try {
          const result = await mammoth.extractRawText({ buffer });
          fileContent = result.value;
          console.log("DOC content extracted successfully");
        } catch (docError) {
          console.error("Error extracting DOC content:", docError);
          fileContent = "Could not parse DOC file content";
        }
      }
      else {
        // For other files, try simple text extraction
        fileContent = buffer.toString('utf-8').substring(0, 10000);
      }
    } catch (err) {
      console.error("Error extracting text:", err);
      fileContent = "Error reading file content";
    }
    
    // Parse the content to extract experience level and target roles
    let parsedData = {
      experienceLevel: '',
      targetRoles: ''
    };
    
    // Simple keyword-based parsing
    if (fileContent) {
      // Experience level detection
      if (fileContent.match(/entry|new grad|fresh graduate|0-1 year/i)) {
        parsedData.experienceLevel = 'Entry-level / New Grad';
      } else if (fileContent.match(/junior|1-2 year|1 year|2 year/i)) {
        parsedData.experienceLevel = 'Junior (1-2 years)';
      } else if (fileContent.match(/mid|3-5 year|3 year|4 year|5 year/i)) {
        parsedData.experienceLevel = 'Mid-level (3-5 years)';
      } else if (fileContent.match(/senior|5-10 year|6 year|7 year|8 year|9 year|10 year/i)) {
        parsedData.experienceLevel = 'Senior (5-10 years)';
      } else if (fileContent.match(/staff|principal|lead|architect|10\+ year/i)) {
        parsedData.experienceLevel = 'Staff / Principal (10+ years)';
      } else if (fileContent.match(/manager|director|head of/i)) {
        parsedData.experienceLevel = 'Manager';
      } else {
        parsedData.experienceLevel = 'Mid-level (3-5 years)'; // Default
      }
      
      // Role detection
      const roleMatches = [];
      const rolePatterns = [
        /frontend developer/i, 
        /backend developer/i,
        /full stack/i,
        /software engineer/i,
        /web developer/i,
        /react developer/i,
        /javascript developer/i,
        /node\.js developer/i,
        /ui\/ux designer/i,
        /product manager/i,
        /data scientist/i,
        /machine learning/i,
        /devops/i,
        /qa engineer/i,
        /test engineer/i,
        /android developer/i,
        /ios developer/i,
        /mobile developer/i
      ];
      
      rolePatterns.forEach(pattern => {
        if (fileContent.match(pattern)) {
          roleMatches.push(pattern.toString().replace(/\/i$|^\//g, '').replace(/\\./g, '.'));
        }
      });
      
      if (roleMatches.length > 0) {
        parsedData.targetRoles = roleMatches.join(', ');
      } else {
        parsedData.targetRoles = 'Software Developer'; // Default
      }
    }
    
    // Simulate file storage - in production, use a real storage service
    const fileName = resumeFile.name.replace(/\s+/g, '-').toLowerCase();
    const resumeUrl = `https://storage.example.com/${Date.now()}-${fileName}`;
    
    // Save the extracted content and other data to the database
    await db.update(users)
      .set({
        resumeUrl,
        resumeContent: fileContent, // Store the extracted text content
        ...(parsedData.experienceLevel && { experienceLevel: parsedData.experienceLevel }),
        ...(parsedData.targetRoles && { targetRoles: parsedData.targetRoles })
      })
      .where(eq(users.id, session.user.id));
    
    return NextResponse.json({
      success: true,
      name: resumeFile.name, 
      type: resumeFile.type, 
      size: resumeFile.size,
      content: fileContent.substring(0, 1000) + (fileContent.length > 1000 ? '...' : ''), // Send preview to client
      parsedData,
      resumeUrl
    });
    
  } catch (error) {
    console.error('Resume upload error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      success: false
    }, { status: 500 });
  }
}