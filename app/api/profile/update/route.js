import { auth } from "@/app/api/auth/[...auth]/route"
import { db } from "@/utils/db";
import { users } from "@/utils/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      experienceLevel,
      targetRoles,
      timezone
    } = body;

    // Basic validation
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    await db.update(users)
      .set({
        name,
        experienceLevel,
        targetRoles,
        timezone,
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ message: 'Profile updated successfully.' });

  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 