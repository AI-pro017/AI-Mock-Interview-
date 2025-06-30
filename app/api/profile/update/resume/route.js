import { NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const resumeFile = formData.get('resume');
    
    if (!resumeFile) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    // Extract file content
    let fileContent = '';
    try {
      // Convert file to array buffer then to text
      const arrayBuffer = await resumeFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      // For text-based files, convert to string
      if (resumeFile.type.includes('text/') || 
          resumeFile.type === 'application/msword' ||
          resumeFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        fileContent = buffer.toString('utf-8').substring(0, 1000); // Limit to first 1000 chars
      }else if(resumeFile.type === 'application/pdf') {
        const pdfData = await pdfParse(buffer);
        fileContent  = pdfData.text;
      }else if (resumeFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // For DOCX files
        const result = await mammoth.extractRawText({ buffer });
        fileContent = result.value;
        console.log("DOCX content extracted successfully");
      } 
      else if (resumeFile.type === 'application/msword') {
        // For DOC files - older format
        // Note: mammoth may not work perfectly with old .doc files
        try {
          const result = await mammoth.extractRawText({ buffer });
          fileContent = result.value;
          console.log("DOC content extracted successfully");
        } catch (docError) {
          console.error("Error extracting DOC content:", docError);
          fileContent = "Could not parse DOC file content. Consider converting to DOCX format.";
        }
      }else {
        // For binary files like PDFs, show base64 preview
        fileContent = `Binary file (${buffer.length} bytes), Base64 preview: ${buffer.toString('base64').substring(0, 100)}...`;
      }
    } catch (err) {
      console.error("Error reading file content:", err);
      fileContent = "Error reading file content";
    }
    
    // Mock parsed data
    const parsedData = {
      experienceLevel: 'Mid-level (3-5 years)',
      targetRoles: 'Frontend Developer, React Developer'
    };
    
    return NextResponse.json({
      success: true,
      name: resumeFile.name, 
      type: resumeFile.type, 
      size: resumeFile.size,
      content: fileContent,
      parsedData,
      resumeUrl: `https://storage.example.com/${Date.now()}-${resumeFile.name}`
    });
    
  } catch (error) {
    console.error('Resume upload error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}