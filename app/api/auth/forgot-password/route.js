import { db } from '@/utils/db';
import { users } from '@/utils/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = userResult[0];

    // We don't want to reveal if a user exists or not for security reasons.
    // So, we'll send a success response even if the user is not found.
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      await db.update(users)
        .set({
          resetToken: resetToken,
          resetTokenExpiry: resetTokenExpiry,
        })
        .where(eq(users.email, email));

      const url = new URL(req.url);
      const baseUrl = `${url.protocol}//${url.host}`;
      const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
      
      // NOTE: You need to create this email template or use a simple text email.
      // This is a placeholder for the email sending logic.
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: email,
        subject: 'Reset Your Password',
        html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`
      });
    }

    return NextResponse.json({ message: 'If an account with that email exists, a password reset link has been sent.' });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 