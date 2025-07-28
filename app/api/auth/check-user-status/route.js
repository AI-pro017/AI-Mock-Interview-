import { NextResponse } from 'next/server';
import { db } from '@/utils/db';
import { users } from '@/utils/schema';
import { eq } from 'drizzle-orm';

export async function POST(request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user exists and if they are disabled
    const userResult = await db.select({
      disabled: users.disabled,
      emailVerified: users.emailVerified
    }).from(users).where(eq(users.email, email)).limit(1);
    
    const user = userResult[0];

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({ disabled: false });
    }

    return NextResponse.json({ 
      disabled: user.disabled || false 
    });

  } catch (error) {
    console.error('Error checking user status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 