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
    const { disable = true, reason } = await request.json();

    // Get user info before update
    const userInfo = await sql`
      SELECT email, name, disabled FROM users WHERE id = ${userId}
    `;

    if (userInfo.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update disabled status
    await sql`
      UPDATE users 
      SET disabled = ${disable}
      WHERE id = ${userId}
    `;

    // Log admin action
    await sql`
      INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, details)
      VALUES (
        ${adminUser[0].id}, 
        ${disable ? 'user_disabled' : 'user_enabled'}, 
        'user', 
        ${userId}, 
        ${JSON.stringify({ 
          reason, 
          previousStatus: userInfo[0].disabled,
          newStatus: disable,
          userEmail: userInfo[0].email
        })}
      )
    `;

    console.log(`${disable ? '🚫' : '✅'} User ${disable ? 'disabled' : 'enabled'}: ${userInfo[0].email}`);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Disable user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 