import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get masked versions of the sensitive env vars
    const googleClientId = process.env.GOOGLE_CLIENT_ID 
      ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 5)}...${process.env.GOOGLE_CLIENT_ID.slice(-5)}`
      : 'NOT SET';
    
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
      ? `${process.env.GOOGLE_CLIENT_SECRET.substring(0, 3)}...${process.env.GOOGLE_CLIENT_SECRET.slice(-3)}`
      : 'NOT SET';

    return NextResponse.json({
      status: 'success',
      message: 'Environment variables check',
      envVars: {
        googleClientId,
        googleClientSecret,
        nodeEnv: process.env.NODE_ENV,
        nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT SET',
        vercelUrl: process.env.VERCEL_URL || 'NOT SET',
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to check environment variables',
      error: error.message
    }, { status: 500 });
  }
}