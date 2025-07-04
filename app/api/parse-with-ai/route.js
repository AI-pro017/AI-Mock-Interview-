import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  const { text } = await req.json();
  
  if (!text) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "system",
        content: `You are an expert resume parser. Extract the following information from the provided resume text and return it as a valid JSON object. If a field is not found, return an empty string or an empty array.

        - phoneNumber: string
        - location: { city: string, country: string }
        - professionalTitle: string
        - yearsOfExperience: number
        - professionalSummary: string
        - workHistory: array of { companyName: string, jobTitle: string, startDate: string, endDate: string, description: string }
        - skills: array of strings
        - education: array of { institutionName: string, degreeType: string, fieldOfStudy: string, graduationYear: string, gpa: string }
        - certifications: array of strings
        - hobbiesInterests: array of strings
        `
      }, {
        role: "user",
        content: text
      }],
      response_format: { type: "json_object" }
    });
    
    const parsedData = JSON.parse(completion.choices[0].message.content);
    return NextResponse.json(parsedData);
  } catch (error) {
    console.error('Error parsing with OpenAI:', error);
    return NextResponse.json({ error: 'Failed to parse resume with AI.' }, { status: 500 });
  }
} 