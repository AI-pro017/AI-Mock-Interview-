// AI-Mock-Interview-/app/api/auth/verify-email/route.js
import { db } from '@/utils/db';
import { users, verificationTokens } from '@/utils/schema';
import { eq, and, gt } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Verification token is missing.' }, { status: 400 });
    }

    // Find the token in the database and ensure it has not expired
    const tokenRecord = await db.query.verificationTokens.findFirst({
        where: and(
            eq(verificationTokens.token, token),
            gt(verificationTokens.expires, new Date())
        )
    });

    if (!tokenRecord) {
        return NextResponse.json({ error: 'Invalid or expired verification token.' }, { status: 400 });
    }

    const userEmail = tokenRecord.identifier;

    // The transaction has been removed. Operations are now sequential.

    // 1. Mark user's email as verified
    await db.update(users)
        .set({ emailVerified: new Date() })
        .where(eq(users.email, userEmail));
    
    // 2. Delete the token so it can't be used again
    await db.delete(verificationTokens)
        .where(eq(verificationTokens.identifier, userEmail));

    return NextResponse.json({ message: 'Email verified successfully.' });

  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}