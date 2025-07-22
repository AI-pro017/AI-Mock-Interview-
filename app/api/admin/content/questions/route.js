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

    const questions = await sql`
      SELECT 
        qt.id,
        qt.question,
        qt.category,
        qt.difficulty,
        qt.expected_answer as "expectedAnswer",
        qt.evaluation_criteria as "evaluationCriteria",
        qt.tags,
        qt.is_active as "isActive",
        qt.created_at as "createdAt",
        qt.updated_at as "updatedAt",
        jr.name as "jobRole"
      FROM question_templates qt
      LEFT JOIN job_roles jr ON qt.job_role_id = jr.id
      ORDER BY qt.created_at DESC
    `;

    return NextResponse.json(questions);

  } catch (error) {
    console.error('Questions fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
