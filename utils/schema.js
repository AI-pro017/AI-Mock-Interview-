// AI-Mock-Interview-/utils/schema.js
// Add Users table for authentication

import {
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  varchar,
  serial,
  boolean,
} from "drizzle-orm/pg-core"

// Existing tables
export const MockInterview = pgTable('mockInterview', {
    id: serial('id').primaryKey(),
    mockId: varchar('jsonMockResp', { length: 255 }).notNull().unique(),
    jobPosition: varchar('jobPosition', { length: 255 }).notNull(),
    jobDesc: text('jobDesc').notNull(),
    jobExperience: varchar('jobExperience', { length: 255 }).notNull(),
    
    // New Configuration Fields
    industry: varchar('industry', { length: 255 }),
    skills: text('skills'),
    difficulty: varchar('difficulty', { length: 50 }).default('Medium'),
    focus: varchar('focus', { length: 50 }).default('Balanced'), // e.g., 'Technical', 'Behavioral', 'Balanced'
    duration: integer('duration').default(30), // in minutes
    interviewStyle: varchar('interviewStyle', { length: 50 }).default('Conversational'),
    interviewMode: varchar('interviewMode', { length: 50 }).default('Practice'),
    questionCategories: text('questionCategories'), // User-defined categories

    createdBy: varchar('createdBy', { length: 255 }).notNull(),
    createdAt: varchar('createdAt', { length: 255 }),
    // jsonMockResp is now mockId, assuming response is stored elsewhere or generated later
});

export const UserAnswer = pgTable('userAnswer', {
    id: serial('id').primaryKey(),
    question: varchar('question').notNull(),
    correctAns: text('correctAns'),
    userAns: text('userAns'),
    feedback: text('feedback'),
    rating: varchar('rating'),
    userEmail: varchar('userEmail'),
    createdAt: varchar('createdAt'),
    mockIdRef: varchar('mockId').notNull(),
});

export const PersonalityFeedback = pgTable('personalityFeedback', {
    id: serial('id').primaryKey(),
    question: text('question').notNull(),          
    answer: text('answer').notNull(),              
    userEmail: varchar('userEmail'),               
    createdAt: varchar('createdAt'),               
    index: integer('index').notNull()              
});

// New tables for next-auth
export const users = pgTable("users", {
  id: text("id").notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  passwordHash: varchar('passwordHash'), // For credentials-based auth
  resetToken: varchar('resetToken'), // For password reset
  resetTokenExpiry: timestamp('resetTokenExpiry'), // For password reset
  
  // New fields for User Profile
  experienceLevel: varchar('experienceLevel'), // e.g., 'Entry-level', 'Mid-level', 'Senior'
  targetRoles: text('targetRoles'), // Can be a JSON string of roles
  resumeUrl: varchar('resumeUrl'),
  timezone: varchar('timezone'),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
)

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").notNull().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
})

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull().primaryKey(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  }
)