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

    const credits = await sql`
      SELECT 
        sc.id,
        sc.session_type as "sessionType",
        sc.credits_granted as "creditsGranted",
        sc.reason,
        sc.expires_at as "expiresAt",
        sc.is_used as "isUsed",
        sc.used_at as "usedAt",
        sc.created_at as "createdAt",
        u.email as "userEmail",
        admin_user.name as "adminName"
      FROM session_credits sc
      JOIN users u ON sc.user_id = u.id
      JOIN admin_users au ON sc.admin_user_id = au.id
      JOIN users admin_user ON au.user_id = admin_user.id
      ORDER BY sc.created_at DESC
      LIMIT 50
    `;

    return NextResponse.json(credits);

  } catch (error) {
    console.error('Session credits fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
