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
  decimal,
} from "drizzle-orm/pg-core"
import { relations } from 'drizzle-orm'

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
    duration: integer('duration').default(15), // in minutes
    interviewStyle: varchar('interviewStyle', { length: 50 }).default('Conversational'),
    interviewMode: varchar('interviewMode', { length: 50 }).default('Practice'),
    questionCategories: text('questionCategories'), // User-defined categories

    createdBy: varchar('createdBy', { length: 255 }).notNull(),
    createdAt: varchar('createdAt', { length: 255 }),
    // jsonMockResp is now mockId, assuming response is stored elsewhere or generated later
});

export const UserAnswer = pgTable('userAnswer', {
    id: serial('id').primaryKey(),
    mockIdRef: varchar('mockId').notNull(),
    question: varchar('question').notNull(),
    correctAns: text('correctAns'), // Will be populated by AI
    userAns: text('userAns'),
    feedback: text('feedback'), // General feedback
    rating: varchar('rating'),
    
    // New fields for detailed analysis
    clarityScore: integer('clarityScore'), // 1-10
    paceScore: integer('paceScore'), // 1-10, e.g., words per minute
    fillerWords: integer('fillerWords'), // Count of filler words
    confidenceScore: integer('confidenceScore'), // 1-10
    technicalScore: integer('technicalScore'), // 1-10, if applicable
    grammarScore: integer('grammarScore'), // 1-10
    
    userEmail: varchar('userEmail'),
    createdAt: varchar('createdAt'),
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

// New table for overall interview report
export const InterviewReport = pgTable('interviewReport', {
    id: serial('id').primaryKey(),
    mockIdRef: varchar('mockId').notNull().unique(), // Link to the interview session
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    
    // Overall scores and summaries
    overallScore: integer('overallScore'), // Weighted average score
    strengths: text('strengths'), // Summary of strengths
    weaknesses: text('weaknesses'), // Summary of weaknesses
    improvementPlan: text('improvementPlan'), // Personalized suggestions
    
    createdAt: timestamp('createdAt').defaultNow(),
});

// Main User Profile Table (One-to-One data)
export const UserProfile = pgTable('user_profiles', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(), // Link to the auth user
  fullName: varchar('full_name', { length: 255 }),
  phoneNumber: varchar('phone_number', { length: 50 }),
  professionalTitle: varchar('professional_title', { length: 255 }),
  locationCity: varchar('location_city', { length: 100 }),
  locationCountry: varchar('location_country', { length: 100 }),
  yearsOfExperience: integer('years_of_experience'),
  professionalSummary: text('professional_summary'),
  skills: text('skills'), // Store skills as a single text field
  hobbiesInterests: text('hobbies_interests'), // Add this field
});

// One-to-Many table for Work History
export const WorkHistory = pgTable('work_history', {
  id: serial('id').primaryKey(),
  userProfileId: integer('user_profile_id').notNull().references(() => UserProfile.id, { onDelete: 'cascade' }),
  jobTitle: varchar('job_title', { length: 255 }),
  companyName: varchar('company_name', { length: 255 }),
  startDate: varchar('start_date', { length: 50 }),
  endDate: varchar('end_date', { length: 50 }),
  description: text('description'),
});

// One-to-Many table for Education
export const Education = pgTable('education', {
  id: serial('id').primaryKey(),
  userProfileId: integer('user_profile_id').notNull().references(() => UserProfile.id, { onDelete: 'cascade' }),
  institutionName: varchar('institution_name', { length: 255 }),
  degreeType: varchar('degree_type', { length: 255 }),
  fieldOfStudy: varchar('field_of_study', { length: 255 }),
  graduationYear: varchar('graduation_year', { length: 50 }),
  gpa: varchar('gpa', { length: 10 }),
});

// One-to-Many table for Certifications
export const Certifications = pgTable('certifications', {
    id: serial('id').primaryKey(),
    userProfileId: integer('user_profile_id').notNull().references(() => UserProfile.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }),
    issuingOrg: varchar('issuing_org', { length: 255 }),
    date: varchar('date', { length: 50 }),
});

// Optional: Define relations for easier querying later
export const userProfileRelations = relations(UserProfile, ({ many }) => ({
	workHistory: many(WorkHistory),
	education: many(Education),
    certifications: many(Certifications),
}));

// Subscription Tables
export const subscriptionPlans = pgTable('subscription_plans', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(), // 'freemium', 'starter', 'pro', 'unlimited'
  displayName: varchar('display_name', { length: 100 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  mockSessionsLimit: integer('mock_sessions_limit'), // null for unlimited
  realTimeHelpLimit: integer('real_time_help_limit'), // null for unlimited
  mockSessionDuration: integer('mock_session_duration'), // in minutes, null for unlimited
  realTimeHelpDuration: integer('real_time_help_duration'), // in minutes, null for unlimited
  features: text('features'), // JSON string of features
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const userSubscriptions = pgTable('user_subscriptions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  planId: integer('plan_id').notNull().references(() => subscriptionPlans.id),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'active', 'canceled', 'past_due', 'incomplete'
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const usageTracking = pgTable('usage_tracking', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subscriptionId: integer('subscription_id').notNull().references(() => userSubscriptions.id, { onDelete: 'cascade' }),
  sessionType: varchar('session_type', { length: 50 }).notNull(), // 'mock_interview', 'real_time_help'
  sessionId: varchar('session_id', { length: 255 }).notNull(), // Reference to MockInterview.mockId or other session ID
  duration: integer('duration'), // in minutes
  usedAt: timestamp('used_at').defaultNow(),
  billingMonth: varchar('billing_month', { length: 7 }).notNull(), // 'YYYY-MM' format
});

export const subscriptionRelations = relations(subscriptionPlans, ({ many }) => ({
  userSubscriptions: many(userSubscriptions),
}));

export const userSubscriptionRelations = relations(userSubscriptions, ({ one, many }) => ({
  user: one(users, { fields: [userSubscriptions.userId], references: [users.id] }),
  plan: one(subscriptionPlans, { fields: [userSubscriptions.planId], references: [subscriptionPlans.id] }),
  usageTracking: many(usageTracking),
}));

export const usageTrackingRelations = relations(usageTracking, ({ one }) => ({
  user: one(users, { fields: [usageTracking.userId], references: [users.id] }),
  subscription: one(userSubscriptions, { fields: [usageTracking.subscriptionId], references: [userSubscriptions.id] }),
}));