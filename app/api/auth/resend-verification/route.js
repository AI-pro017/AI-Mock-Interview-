import { db } from '@/utils/db';
import { users, verificationTokens } from '@/utils/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import crypto from 'crypto';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const fromEmail = process.env.SENDGRID_VERIFIED_SENDER;

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = userResult[0];

    // Only proceed if the user exists and is not yet verified.
    if (!user || user.emailVerified) {
      return NextResponse.json({ message: 'If this account requires verification, a new email has been sent.' });
    }

    // Generate and send a new token, same as in the register route.
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.insert(verificationTokens).values({
      identifier: email,
      token: token,
      expires: expires,
    }).onConflictDoUpdate({
        target: verificationTokens.identifier,
        set: { token: token, expires: expires }
    });
    
    const verificationLink = `${process.env.NEXT_PUBLIC_URL}/verify-email?token=${token}`;
    
    if (!fromEmail) {
      throw new Error("SENDGRID_VERIFIED_SENDER is not set in the environment variables.");
    }
    
    const msg = {
        to: email,
        from: fromEmail,
        subject: 'Resend: Verify Your Email Address',
        html: `<p>Hello ${user.name},</p><p>Please click the link below to verify your email address:</p><p><a href="${verificationLink}">${verificationLink}</a></p><p>This link will expire in 24 hours.</p>`,
    };
    
    await sgMail.send(msg);

    return NextResponse.json({ message: 'A new verification email has been sent. Please check your inbox.' });

  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 