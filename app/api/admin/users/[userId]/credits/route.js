import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { neon } from '@neondatabase/serverless';

export async function POST(request, { params }) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = neon(process.env.NEXT_PUBLIC_DRIZZLE_DB_URL);
    
    // Check admin authorization
    const adminUser = await sql`
      SELECT * FROM admin_users WHERE user_id = ${session.user.id} AND is_active = true
    `;

    if (adminUser.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = params.userId;
    const { sessionType, credits, reason, expiresInDays } = await request.json();

    // Validate input
    if (!sessionType || !credits || credits <= 0) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    if (!['mock_interview', 'real_time_help'].includes(sessionType)) {
      return NextResponse.json({ error: 'Invalid session type' }, { status: 400 });
    }

    // Calculate expiration date if provided
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));
    }

    // Add credits to the user
    await sql`
      INSERT INTO session_credits (
        user_id, 
        admin_user_id, 
        session_type, 
        credits_granted, 
        reason, 
        expires_at
      )
      VALUES (
        ${userId}, 
        ${adminUser[0].id}, 
        ${sessionType}, 
        ${parseInt(credits)}, 
        ${reason || 'Admin granted credits'}, 
        ${expiresAt ? expiresAt.toISOString() : null}
      )
    `;

    // Log admin action
    await sql`
      INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, details)
      VALUES (
        ${adminUser[0].id}, 
        'credits_granted', 
        'user', 
        ${userId}, 
        ${JSON.stringify({ sessionType, credits, reason, expiresAt })}
      )
    `;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Add credits error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 