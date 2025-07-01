// app/api/interview-analysis/route.js (simplified version)
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Interview analysis API route is working (GET)' });
}

export async function POST(req) {
  try {
    const body = await req.json();
    return NextResponse.json({ 
      message: 'Interview analysis API is working (POST)',
      receivedData: body
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}