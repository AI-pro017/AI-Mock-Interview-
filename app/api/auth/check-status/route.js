import { db } from '@/utils/db';
import { users } from '@/utils/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const userResult = await db.select({ emailVerified: users.emailVerified }).from(users).where(eq(users.email, email)).limit(1);
    const user = userResult[0];

    if (user && !user.emailVerified) {
      // The user exists but is not verified.
      return NextResponse.json({ status: 'unverified' });
    }

    // For all other cases (user is verified, or user does not exist),
    // we tell the client to proceed with the normal sign-in attempt.
    return NextResponse.json({ status: 'proceed' });

  } catch (error) {
    // On any unexpected error, default to proceeding with the sign-in attempt.
    console.error('Check status error:', error);
    return NextResponse.json({ status: 'proceed' });
  }
} 