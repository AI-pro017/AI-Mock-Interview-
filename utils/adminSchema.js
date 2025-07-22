import {
    timestamp,
    pgTable,
    text,
    integer,
    varchar,
    serial,
    boolean,
    json,
  } from "drizzle-orm/pg-core"
  import { relations } from 'drizzle-orm'
  import { users } from './schema'
  
  // Admin Users Table
  export const adminUsers = pgTable('admin_users', {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 50 }).notNull().default('support'), // 'super_admin', 'admin', 'support'
    permissions: json('permissions'), // JSON array of permissions
    isActive: boolean('is_active').default(true),
    lastLogin: timestamp('last_login'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  });
  
  // Admin Audit Log
  export const adminAuditLog = pgTable('admin_audit_log', {
    id: serial('id').primaryKey(),
    adminUserId: integer('admin_user_id').notNull().references(() => adminUsers.id),
    action: varchar('action', { length: 100 }).notNull(), // 'user_created', 'plan_changed', etc.
    targetType: varchar('target_type', { length: 50 }), // 'user', 'subscription', 'session'
    targetId: varchar('target_id', { length: 255 }), // ID of the affected resource
    details: json('details'), // Additional details about the action
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow(),
  });
  
  // User Support Notes
  export const userSupportNotes = pgTable('user_support_notes', {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    adminUserId: integer('admin_user_id').notNull().references(() => adminUsers.id),
    note: text('note').notNull(),
    priority: varchar('priority', { length: 20 }).default('normal'), // 'low', 'normal', 'high', 'urgent'
    isInternal: boolean('is_internal').default(false), // Internal notes vs customer-visible
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  });
  
  // Session Credits (for issuing temporary credits)
  export const sessionCredits = pgTable('session_credits', {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    adminUserId: integer('admin_user_id').notNull().references(() => adminUsers.id),
    sessionType: varchar('session_type', { length: 50 }).notNull(), // 'mock_interview', 'real_time_help'
    creditsGranted: integer('credits_granted').notNull(),
    reason: text('reason'),
    expiresAt: timestamp('expires_at'),
    isUsed: boolean('is_used').default(false),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').defaultNow(),
  });
  
  // Job Roles Management
  export const jobRoles = pgTable('job_roles', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    category: varchar('category', { length: 50 }), // 'Technology', 'Marketing', 'Sales', etc.
    description: text('description'),
    skillsRequired: json('skills_required'), // Array of skills
    experienceLevels: json('experience_levels'), // Array of levels: ['Entry', 'Mid', 'Senior']
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  });
  
  // Interview Question Templates
  export const questionTemplates = pgTable('question_templates', {
    id: serial('id').primaryKey(),
    jobRoleId: integer('job_role_id').references(() => jobRoles.id, { onDelete: 'set null' }),
    question: text('question').notNull(),
    category: varchar('category', { length: 50 }), // 'technical', 'behavioral', 'situational'
    difficulty: varchar('difficulty', { length: 20 }).default('medium'), // 'easy', 'medium', 'hard'
    expectedAnswer: text('expected_answer'),
    evaluationCriteria: json('evaluation_criteria'),
    tags: json('tags'), // Array of tags for filtering
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  });
  
  // AI Copilot Prompt Templates
  export const copilotPromptTemplates = pgTable('copilot_prompt_templates', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    systemPrompt: text('system_prompt').notNull(),
    jobRoleId: integer('job_role_id').references(() => jobRoles.id, { onDelete: 'set null' }),
    experienceLevel: varchar('experience_level', { length: 50 }),
    isActive: boolean('is_active').default(true),
    isDefault: boolean('is_default').default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  });
  
  // Relations
  export const adminUserRelations = relations(adminUsers, ({ one, many }) => ({
    user: one(users, { fields: [adminUsers.userId], references: [users.id] }),
    auditLogs: many(adminAuditLog),
    supportNotes: many(userSupportNotes),
    sessionCredits: many(sessionCredits),
  }));
  
  export const jobRoleRelations = relations(jobRoles, ({ many }) => ({
    questionTemplates: many(questionTemplates),
    copilotPromptTemplates: many(copilotPromptTemplates),
  }));