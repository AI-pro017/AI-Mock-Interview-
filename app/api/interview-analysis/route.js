// app/api/interview-analysis/route.js
// Start with a simplified version that just logs and returns a basic response
import { NextResponse } from 'next/server';

console.log("API ROUTE LOADED: /api/interview-analysis");

export async function POST(req) {
  console.log("### FEEDBACK ANALYSIS: Simple API endpoint called ###");
  
  try {
    // Parse request body
    const body = await req.json();
    console.log("### FEEDBACK ANALYSIS: Request body parsed ###", body);
    
    // Return a simple success response
    return NextResponse.json({ 
      message: 'API call successful',
      receivedData: body
    });
  } catch (error) {
    console.log("### FEEDBACK ANALYSIS: Error in simple endpoint ###", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}