import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { neon } from '@neondatabase/serverless';

export async function DELETE(request, { params }) {
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

    // Get user info before deletion for logging
    const userToDelete = await sql`
      SELECT email, name FROM users WHERE id = ${userId}
    `;

    if (userToDelete.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete user (this will cascade delete related records due to foreign key constraints)
    await sql`DELETE FROM users WHERE id = ${userId}`;

    // Log admin action
    await sql`
      INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, details)
      VALUES (
        ${adminUser[0].id}, 
        'user_deleted', 
        'user', 
        ${userId}, 
        ${JSON.stringify({ 
          deletedUser: userToDelete[0],
          deletedBy: session.user.email 
        })}
      )
    `;

    console.log(`🗑️ User deleted: ${userToDelete[0].email} by admin: ${session.user.email}`);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 