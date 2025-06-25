// AI-Mock-Interview-/app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import { db } from '../../../../utils/db';
import { Users } from '../../../../utils/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Find user by email
    const user = await db.query.Users.findFirst({
      where: eq(Users.email, email),
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Check if user is verified
    if (!user.verified) {
      return NextResponse.json({ error: 'Please verify your email before logging in.' }, { status: 403 });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store session token in database (ensure you have a sessionTokenExpiresAt field or similar)
    // For simplicity, I'm just updating the sessionToken. Add expiry handling as needed.
    await db.update(Users)
      .set({ sessionToken: sessionToken /*, sessionTokenExpiresAt: sessionExpiry */ })
      .where(eq(Users.id, user.id));

    // Set session cookie
    cookies().set('auth-token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: sessionExpiry,
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.json({ success: true, message: 'Logged in successfully' });

  } catch (error) {
    console.error('Login API Error:', error);
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 });
  }
}