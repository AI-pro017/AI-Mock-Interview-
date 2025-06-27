// AI-Mock-Interview-/app/api/auth/send-verification/route.js
import sgMail from '@sendgrid/mail';
import { NextResponse } from 'next/server';
import { db } from '../../../../utils/db';
import { users } from '../../../../utils/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function POST(request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    
    if (existingUser) {
      // Update existing user with new verification token
      await db.update(users)
        .set({ verificationToken })
        .where(eq(users.email, email));
    } else {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Send verification email
    const verificationLink = `${process.env.NEXT_PUBLIC_APP_URL}/verify?token=${verificationToken}`;
    
    const msg = {
      to: email,
      from: process.env.SENDGRID_VERIFIED_SENDER,
      subject: 'Verify your Mock Mate AI account',
      text: `Click the link to verify your account: ${verificationLink}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2c5f73;">Verify your Mock Mate AI account</h1>
          <p>Click the button below to verify your account:</p>
          <a href="${verificationLink}" style="display: inline-block; background-color: #2c5f73; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Verify Account</a>
          <p>Or copy and paste this link into your browser:</p>
          <p>${verificationLink}</p>
        </div>
      `
    };
    
    await sgMail.send(msg);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending verification email:', error);
    return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
  }
}