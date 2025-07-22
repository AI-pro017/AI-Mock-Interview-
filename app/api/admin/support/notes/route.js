import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { neon } from '@neondatabase/serverless';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin authorization
    const sql = neon(process.env.NEXT_PUBLIC_DRIZZLE_DB_URL);
    
    const adminUser = await sql`
      SELECT * FROM admin_users WHERE user_id = ${session.user.id} AND is_active = true
    `;

    if (adminUser.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const notes = await sql`
      SELECT 
        usn.id,
        usn.note,
        usn.priority,
        usn.is_internal as "isInternal",
        usn.created_at as "createdAt",
        usn.updated_at as "updatedAt",
        u.email as "userEmail",
        au.role as "adminRole",
        admin_user.name as "adminName"
      FROM user_support_notes usn
      JOIN users u ON usn.user_id = u.id
      JOIN admin_users au ON usn.admin_user_id = au.id
      JOIN users admin_user ON au.user_id = admin_user.id
      ORDER BY usn.created_at DESC
      LIMIT 50
    `;

    return NextResponse.json(notes);

  } catch (error) {
    console.error('Support notes fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
