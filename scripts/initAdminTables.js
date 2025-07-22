const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Initialize database connection
const sql = neon(process.env.NEXT_PUBLIC_DRIZZLE_DB_URL);
const db = drizzle(sql);

async function initAdminTables() {
  try {
    console.log('🚀 Creating admin tables...');

    // Create admin_users table
    await sql`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'support',
        permissions JSON,
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create admin_audit_log table
    await sql`
      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id SERIAL PRIMARY KEY,
        admin_user_id INTEGER NOT NULL REFERENCES admin_users(id),
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id VARCHAR(255),
        details JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create user_support_notes table
    await sql`
      CREATE TABLE IF NOT EXISTS user_support_notes (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        admin_user_id INTEGER NOT NULL REFERENCES admin_users(id),
        note TEXT NOT NULL,
        priority VARCHAR(20) DEFAULT 'normal',
        is_internal BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create session_credits table
    await sql`
      CREATE TABLE IF NOT EXISTS session_credits (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        admin_user_id INTEGER NOT NULL REFERENCES admin_users(id),
        session_type VARCHAR(50) NOT NULL,
        credits_granted INTEGER NOT NULL,
        reason TEXT,
        expires_at TIMESTAMP,
        is_used BOOLEAN DEFAULT false,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create job_roles table
    await sql`
      CREATE TABLE IF NOT EXISTS job_roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        category VARCHAR(50),
        description TEXT,
        skills_required JSON,
        experience_levels JSON,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create question_templates table
    await sql`
      CREATE TABLE IF NOT EXISTS question_templates (
        id SERIAL PRIMARY KEY,
        job_role_id INTEGER REFERENCES job_roles(id) ON DELETE SET NULL,
        question TEXT NOT NULL,
        category VARCHAR(50),
        difficulty VARCHAR(20) DEFAULT 'medium',
        expected_answer TEXT,
        evaluation_criteria JSON,
        tags JSON,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create copilot_prompt_templates table
    await sql`
      CREATE TABLE IF NOT EXISTS copilot_prompt_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        system_prompt TEXT NOT NULL,
        job_role_id INTEGER REFERENCES job_roles(id) ON DELETE SET NULL,
        experience_level VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✅ Admin tables created successfully!');

    // Insert default job roles
    console.log('📝 Inserting default job roles...');
    
    const defaultRoles = [
      {
        name: 'Software Engineer',
        category: 'Technology',
        description: 'Develops and maintains software applications',
        skills: ['JavaScript', 'Python', 'React', 'Node.js', 'SQL'],
        levels: ['Entry', 'Mid', 'Senior']
      },
      {
        name: 'Product Manager',
        category: 'Product',
        description: 'Manages product development lifecycle',
        skills: ['Product Strategy', 'Analytics', 'User Research', 'Agile'],
        levels: ['Mid', 'Senior', 'Director']
      },
      {
        name: 'Data Scientist',
        category: 'Technology',
        description: 'Analyzes data to derive business insights',
        skills: ['Python', 'R', 'Machine Learning', 'Statistics', 'SQL'],
        levels: ['Entry', 'Mid', 'Senior']
      }
    ];

    for (const role of defaultRoles) {
      await sql`
        INSERT INTO job_roles (name, category, description, skills_required, experience_levels)
        VALUES (${role.name}, ${role.category}, ${role.description}, ${JSON.stringify(role.skills)}, ${JSON.stringify(role.levels)})
        ON CONFLICT (name) DO NOTHING
      `;
    }

    console.log('✅ Default job roles inserted!');
    console.log('🎉 Admin portal setup complete!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up admin tables:', error);
    process.exit(1);
  }
}

// Check if required environment variables are set
if (!process.env.NEXT_PUBLIC_DRIZZLE_DB_URL) {
  console.error('❌ Missing NEXT_PUBLIC_DRIZZLE_DB_URL environment variable');
  process.exit(1);
}

initAdminTables();