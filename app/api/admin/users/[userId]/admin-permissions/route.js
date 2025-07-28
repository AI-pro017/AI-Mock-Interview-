import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { neon } from '@neondatabase/serverless';

// Grant or update admin permissions for a user
export async function POST(request, { params }) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = neon(process.env.NEXT_PUBLIC_DRIZZLE_DB_URL);
    
    // Check if the current user has admin authorization and sufficient privileges
    const currentAdminUser = await sql`
      SELECT * FROM admin_users WHERE user_id = ${session.user.id} AND is_active = true
    `;

    if (currentAdminUser.length === 0) {
      return NextResponse.json({ error: 'Forbidden - No admin privileges' }, { status: 403 });
    }

    const currentAdmin = currentAdminUser[0];
    
    // Only super_admin and admin can grant permissions
    if (!['super_admin', 'admin'].includes(currentAdmin.role)) {
      return NextResponse.json({ error: 'Forbidden - Insufficient privileges' }, { status: 403 });
    }

    const body = await request.json();
    const { action, role, permissions } = body;
    const userId = params.userId;

    // Validate role
    const validRoles = ['super_admin', 'admin', 'support'];
    if (action === 'grant' && !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Super admin check: only super_admin can create other super_admins
    if (role === 'super_admin' && currentAdmin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admin can grant super admin privileges' }, { status: 403 });
    }

    // Check if target user exists
    const targetUser = await sql`
      SELECT id, email, name FROM users WHERE id = ${userId}
    `;

    if (targetUser.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = targetUser[0];

    if (action === 'grant') {
      // Check if user already has admin privileges
      const existingAdmin = await sql`
        SELECT * FROM admin_users WHERE user_id = ${userId}
      `;

      const adminPermissions = permissions || ['all'];

      if (existingAdmin.length > 0) {
        // Update existing admin user
        await sql`
          UPDATE admin_users 
          SET role = ${role}, permissions = ${JSON.stringify(adminPermissions)}, updated_at = NOW()
          WHERE user_id = ${userId}
        `;
      } else {
        // Create new admin user
        await sql`
          INSERT INTO admin_users (user_id, role, permissions, is_active)
          VALUES (${userId}, ${role}, ${JSON.stringify(adminPermissions)}, true)
        `;
      }

      // Log the action
      const adminUserId = currentAdminUser[0].id;
      await sql`
        INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, details)
        VALUES (
          ${adminUserId}, 
          'grant_admin_permissions', 
          'user', 
          ${userId}, 
          ${JSON.stringify({
            role: role,
            permissions: adminPermissions,
            target_email: user.email
          })}
        )
      `;

      return NextResponse.json({
        success: true,
        message: `Admin permissions granted successfully`,
        details: {
          userId: userId,
          email: user.email,
          role: role,
          permissions: adminPermissions
        }
      });

    } else if (action === 'revoke') {
      // Check if user has admin privileges
      const existingAdmin = await sql`
        SELECT * FROM admin_users WHERE user_id = ${userId}
      `;

      if (existingAdmin.length === 0) {
        return NextResponse.json({ error: 'User does not have admin privileges' }, { status: 400 });
      }

      // Prevent self-revocation
      if (userId === session.user.id) {
        return NextResponse.json({ error: 'Cannot revoke your own admin privileges' }, { status: 400 });
      }

      // Remove admin privileges
      await sql`
        DELETE FROM admin_users WHERE user_id = ${userId}
      `;

      // Log the action
      const adminUserId = currentAdminUser[0].id;
      await sql`
        INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, details)
        VALUES (
          ${adminUserId}, 
          'revoke_admin_permissions', 
          'user', 
          ${userId}, 
          ${JSON.stringify({
            target_email: user.email,
            previous_role: existingAdmin[0].role
          })}
        )
      `;

      return NextResponse.json({
        success: true,
        message: `Admin permissions revoked successfully`,
        details: {
          userId: userId,
          email: user.email
        }
      });

    } else {
      return NextResponse.json({ error: 'Invalid action. Use "grant" or "revoke"' }, { status: 400 });
    }

  } catch (error) {
    console.error('Admin permissions management error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// Get admin status for a specific user
export async function GET(request, { params }) {
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

    // Get admin status for target user
    const targetAdminStatus = await sql`
      SELECT au.*, u.email, u.name
      FROM admin_users au
      JOIN users u ON au.user_id = u.id
      WHERE au.user_id = ${userId} AND au.is_active = true
    `;

    if (targetAdminStatus.length === 0) {
      return NextResponse.json({
        hasAdminPermissions: false,
        userId: userId
      });
    }

    const adminData = targetAdminStatus[0];

    return NextResponse.json({
      hasAdminPermissions: true,
      userId: userId,
      role: adminData.role,
      permissions: adminData.permissions,
      lastLogin: adminData.last_login,
      createdAt: adminData.created_at,
      user: {
        email: adminData.email,
        name: adminData.name
      }
    });

  } catch (error) {
    console.error('Get admin status error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 