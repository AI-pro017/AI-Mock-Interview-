// AI-Mock-Interview-/app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import { db } from '../../../../utils/db';
import { users } from '../../../../utils/schema'; // Changed from Users to users
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await db.select().from(users).where(eq(users.email, email));

    if (user.length === 0) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const foundUser = user[0];

    // Check if user is verified
    if (!foundUser.emailVerified) {
      return NextResponse.json(
        { 
          message: 'Please verify your email before signing in',
          requiresVerification: true 
        },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, foundUser.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Set session cookie
    cookies().set('session-token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return NextResponse.json({
      message: 'Sign in successful',
      user: {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name
      }
    });

  } catch (error) {
    console.error('Sign in error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}