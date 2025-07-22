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

    const jobRoles = await sql`
      SELECT 
        id,
        name,
        category,
        description,
        skills_required as "skillsRequired",
        experience_levels as "experienceLevels",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM job_roles
      ORDER BY created_at DESC
    `;

    return NextResponse.json(jobRoles);

  } catch (error) {
    console.error('Job roles fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
