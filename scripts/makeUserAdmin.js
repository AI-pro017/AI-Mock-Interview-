const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Initialize database connection
const sql = neon(process.env.NEXT_PUBLIC_DRIZZLE_DB_URL);
const db = drizzle(sql);

async function makeUserAdmin(email, role = 'admin') {
  try {
    console.log(`🔍 Looking for user with email: ${email}`);
    
    // Find user by email
    const users = await sql`SELECT id, name, email FROM users WHERE email = ${email}`;
    
    if (users.length === 0) {
      console.error('❌ User not found with that email');
      console.log('💡 Make sure the user has signed up first!');
      process.exit(1);
    }

    const user = users[0];
    console.log(`✅ Found user: ${user.name || 'No name'} (${user.email})`);

    // Check if user is already an admin
    const existingAdmin = await sql`
      SELECT * FROM admin_users WHERE user_id = ${user.id}
    `;

    if (existingAdmin.length > 0) {
      console.log('⚠️  User is already an admin, updating role...');
      await sql`
        UPDATE admin_users 
        SET role = ${role}, updated_at = NOW()
        WHERE user_id = ${user.id}
      `;
    } else {
      console.log(`👑 Making user an admin with role: ${role}`);
      await sql`
        INSERT INTO admin_users (user_id, role, permissions, is_active)
        VALUES (${user.id}, ${role}, ${JSON.stringify(['all'])}, true)
      `;
    }

    console.log('🎉 User is now an admin!');
    console.log(`📧 Email: ${user.email}`);
    console.log(`🏷️  Role: ${role}`);
    console.log('');
    console.log('🚀 They can now access the admin portal at: /admin');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error making user admin:', error);
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];
const role = process.argv[3] || 'admin';

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node scripts/makeUserAdmin.js user@example.com [role]');
  console.log('Available roles: super_admin, admin, support');
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_DRIZZLE_DB_URL) {
  console.error('❌ Missing NEXT_PUBLIC_DRIZZLE_DB_URL environment variable');
  process.exit(1);
}

makeUserAdmin(email, role);