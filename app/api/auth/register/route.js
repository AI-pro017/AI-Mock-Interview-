// AI-Mock-Interview-/app/api/auth/register/route.js
import { NextResponse } from 'next/server';
import { db } from '@/utils/db';
import { users, verificationTokens } from '@/utils/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import sgMail from '@sendgrid/mail';
import bcrypt from 'bcryptjs';

// Set the SendGrid API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const fromEmail = process.env.SENDGRID_VERIFIED_SENDER;

export async function POST(req) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existingUser.length > 0) {
      if (existingUser[0].emailVerified) {
        return NextResponse.json({ error: 'An account with this email already exists and is verified.' }, { status: 409 });
      }
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      await db.insert(users).values({
        name,
        email,
        passwordHash,
      });
    }

    // 1. Create a new verification token (this will overwrite any old one if it exists)
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Use Drizzle's upsert functionality to insert a new token or update an existing one for the same email.
    await db.insert(verificationTokens).values({
      identifier: email,
      token: token,
      expires: expires,
    }).onConflictDoUpdate({
        target: verificationTokens.identifier,
        set: { token: token, expires: expires }
    });

    // Dynamically construct the verification link from the request URL
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const verificationLink = `${baseUrl}/verify-email?token=${token}`;
    
    if (!fromEmail) {
      throw new Error("SENDGRID_VERIFIED_SENDER is not set in the environment variables.");
    }
    
    const msg = {
        to: email,
        from: fromEmail,
        subject: 'Verify Your Email Address for Mock Mate AI',
        html: `<p>Hello ${name},</p><p>Please click the link below to verify your email address:</p><p><a href="${verificationLink}">${verificationLink}</a></p><p>This link will expire in 24 hours.</p>`,
    };
    
    await sgMail.send(msg);

    return NextResponse.json({ message: 'Registration successful! Please check your email to verify your account.' }, { status: 201 });

  } catch (error) {
    console.error('--- REGISTRATION FAILED ---');
    console.error('General Error:', error.message);
    
    // This is the important part: Log the specific SendGrid error if it exists.
    if (error.response) {
      console.error('SendGrid Response Error:', JSON.stringify(error.response.body, null, 2));
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}