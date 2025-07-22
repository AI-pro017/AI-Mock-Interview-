import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/utils/db';
import { users } from '@/utils/schema';
import { eq, and } from 'drizzle-orm';

export async function GET() {
  try {
    console.log('🔍 Admin auth check starting...');
    
    const session = await auth();
    console.log('📋 Session:', session ? {
      userId: session.user?.id,
      email: session.user?.email,
      name: session.user?.name
    } : 'No session');
    
    if (!session?.user?.id) {
      console.log('❌ No session or user ID');
      return NextResponse.json({ 
        authorized: false, 
        debug: 'No session or user ID' 
      }, { status: 401 });
    }

    console.log(`🔍 Checking admin status for user ID: ${session.user.id}`);

    // Use raw SQL query with neon directly instead of Drizzle's execute
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.NEXT_PUBLIC_DRIZZLE_DB_URL);
    
    const adminCheck = await sql`
      SELECT au.*, u.name, u.email 
      FROM admin_users au 
      JOIN users u ON au.user_id = u.id 
      WHERE au.user_id = ${session.user.id} AND au.is_active = true
    `;

    console.log('🔍 Admin check result:', adminCheck);

    if (adminCheck.length === 0) {
      console.log('❌ No admin user found');
      
      // Let's also check if the user exists at all
      const userExists = await sql`
        SELECT id, email, name FROM users WHERE id = ${session.user.id}
      `;
      
      console.log('👤 User exists check:', userExists);
      
      return NextResponse.json({ 
        authorized: false,
        debug: {
          message: 'No admin privileges found',
          userId: session.user.id,
          userExists: userExists.length > 0,
          adminRows: adminCheck.length
        }
      }, { status: 403 });
    }

    const adminUser = adminCheck[0];
    console.log('✅ Admin user found:', adminUser);

    // Update last login
    await sql`
      UPDATE admin_users 
      SET last_login = NOW() 
      WHERE id = ${adminUser.id}
    `;

    console.log('✅ Admin auth successful');

    return NextResponse.json({
      authorized: true,
      role: adminUser.role,
      permissions: adminUser.permissions,
      user: {
        id: adminUser.user_id,
        name: adminUser.name,
        email: adminUser.email
      }
    });

  } catch (error) {
    console.error('❌ Admin auth check error:', error);
    return NextResponse.json({ 
      authorized: false, 
      debug: `Error: ${error.message}` 
    }, { status: 500 });
  }
} 