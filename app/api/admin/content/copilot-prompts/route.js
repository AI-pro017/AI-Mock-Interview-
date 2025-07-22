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

    const prompts = await sql`
      SELECT 
        cpt.id,
        cpt.name,
        cpt.description,
        cpt.system_prompt as "systemPrompt",
        cpt.experience_level as "experienceLevel",
        cpt.is_active as "isActive",
        cpt.is_default as "isDefault",
        cpt.created_at as "createdAt",
        cpt.updated_at as "updatedAt",
        jr.name as "jobRole"
      FROM copilot_prompt_templates cpt
      LEFT JOIN job_roles jr ON cpt.job_role_id = jr.id
      ORDER BY cpt.created_at DESC
    `;

    return NextResponse.json(prompts);

  } catch (error) {
    console.error('Copilot prompts fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
