import { pgTable, serial, text, varchar, integer, timestamp, foreignKey, unique, boolean, numeric, json, primaryKey } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"




export const personalityFeedback = pgTable("personalityFeedback", {
	id: serial("id").primaryKey().notNull(),
	question: text("question").notNull(),
	answer: text("answer").notNull(),
	userEmail: varchar("userEmail"),
	createdAt: varchar("createdAt"),
	index: integer("index").notNull(),
});

export const userAnswer = pgTable("userAnswer", {
	id: serial("id").primaryKey().notNull(),
	question: varchar("question").notNull(),
	correctAns: text("correctAns"),
	userAns: text("userAns"),
	feedback: text("feedback"),
	rating: varchar("rating"),
	userEmail: varchar("userEmail"),
	createdAt: varchar("createdAt"),
	mockId: varchar("mockId").notNull(),
	clarityScore: integer("clarityScore"),
	paceScore: integer("paceScore"),
	fillerWords: integer("fillerWords"),
	confidenceScore: integer("confidenceScore"),
	technicalScore: integer("technicalScore"),
	grammarScore: integer("grammarScore"),
});

export const verificationToken = pgTable("verificationToken", {
	identifier: text("identifier").primaryKey().notNull(),
	token: text("token").notNull(),
	expires: timestamp("expires", { mode: 'string' }).notNull(),
});

export const sessions = pgTable("sessions", {
	sessionToken: text("sessionToken").primaryKey().notNull(),
	userId: text("userId").notNull(),
	expires: timestamp("expires", { mode: 'string' }).notNull(),
},
(table) => {
	return {
		sessionsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_userId_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const mockInterview = pgTable("mockInterview", {
	id: serial("id").primaryKey().notNull(),
	jsonMockResp: varchar("jsonMockResp", { length: 255 }).notNull(),
	jobPosition: varchar("jobPosition", { length: 255 }).notNull(),
	jobDesc: text("jobDesc").notNull(),
	jobExperience: varchar("jobExperience", { length: 255 }).notNull(),
	createdBy: varchar("createdBy", { length: 255 }).notNull(),
	createdAt: varchar("createdAt", { length: 255 }),
	industry: varchar("industry", { length: 255 }),
	skills: text("skills"),
	difficulty: varchar("difficulty", { length: 50 }).default('Medium'),
	focus: varchar("focus", { length: 50 }).default('Balanced'),
	duration: integer("duration").default(15),
	interviewStyle: varchar("interviewStyle", { length: 50 }).default('Conversational'),
	interviewMode: varchar("interviewMode", { length: 50 }).default('Practice'),
	questionCategories: text("questionCategories"),
},
(table) => {
	return {
		mockInterviewJsonMockRespUnique: unique("mockInterview_jsonMockResp_unique").on(table.jsonMockResp),
	}
});

export const users = pgTable("users", {
	id: text("id").primaryKey().notNull(),
	name: text("name"),
	email: text("email").notNull(),
	emailVerified: timestamp("emailVerified", { mode: 'string' }),
	image: text("image"),
	passwordHash: varchar("passwordHash"),
	resetToken: varchar("resetToken"),
	resetTokenExpiry: timestamp("resetTokenExpiry", { mode: 'string' }),
	experienceLevel: varchar("experienceLevel"),
	targetRoles: text("targetRoles"),
	resumeUrl: varchar("resumeUrl"),
	timezone: varchar("timezone"),
	disabled: boolean("disabled").default(false),
},
(table) => {
	return {
		usersEmailUnique: unique("users_email_unique").on(table.email),
	}
});

export const subscriptionPlans = pgTable("subscription_plans", {
	id: serial("id").primaryKey().notNull(),
	name: varchar("name", { length: 50 }).notNull(),
	displayName: varchar("display_name", { length: 100 }).notNull(),
	price: numeric("price", { precision: 10, scale:  2 }).notNull(),
	mockSessionsLimit: integer("mock_sessions_limit"),
	realTimeHelpLimit: integer("real_time_help_limit"),
	mockSessionDuration: integer("mock_session_duration"),
	realTimeHelpDuration: integer("real_time_help_duration"),
	features: text("features"),
	stripePriceId: varchar("stripe_price_id", { length: 255 }),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		subscriptionPlansNameUnique: unique("subscription_plans_name_unique").on(table.name),
	}
});

export const usageTracking = pgTable("usage_tracking", {
	id: serial("id").primaryKey().notNull(),
	userId: text("user_id").notNull(),
	subscriptionId: integer("subscription_id"),
	sessionType: varchar("session_type", { length: 50 }).notNull(),
	sessionId: varchar("session_id", { length: 255 }).notNull(),
	duration: integer("duration"),
	usedAt: timestamp("used_at", { mode: 'string' }).defaultNow(),
	billingMonth: varchar("billing_month", { length: 7 }).notNull(),
},
(table) => {
	return {
		usageTrackingUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "usage_tracking_user_id_users_id_fk"
		}).onDelete("cascade"),
		usageTrackingSubscriptionIdUserSubscriptionsIdFk: foreignKey({
			columns: [table.subscriptionId],
			foreignColumns: [userSubscriptions.id],
			name: "usage_tracking_subscription_id_user_subscriptions_id_fk"
		}).onDelete("cascade"),
	}
});

export const userSubscriptions = pgTable("user_subscriptions", {
	id: serial("id").primaryKey().notNull(),
	userId: text("user_id").notNull(),
	planId: integer("plan_id").notNull(),
	stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
	stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
	status: varchar("status", { length: 50 }).default('active').notNull(),
	currentPeriodStart: timestamp("current_period_start", { mode: 'string' }),
	currentPeriodEnd: timestamp("current_period_end", { mode: 'string' }),
	cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		userSubscriptionsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_subscriptions_user_id_users_id_fk"
		}).onDelete("cascade"),
		userSubscriptionsPlanIdSubscriptionPlansIdFk: foreignKey({
			columns: [table.planId],
			foreignColumns: [subscriptionPlans.id],
			name: "user_subscriptions_plan_id_subscription_plans_id_fk"
		}),
	}
});

export const userSupportNotes = pgTable("user_support_notes", {
	id: serial("id").primaryKey().notNull(),
	userId: text("user_id").notNull(),
	adminUserId: integer("admin_user_id").notNull(),
	note: text("note").notNull(),
	priority: varchar("priority", { length: 20 }).default('normal'),
	isInternal: boolean("is_internal").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		userSupportNotesUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_support_notes_user_id_fkey"
		}).onDelete("cascade"),
		userSupportNotesAdminUserIdFkey: foreignKey({
			columns: [table.adminUserId],
			foreignColumns: [adminUsers.id],
			name: "user_support_notes_admin_user_id_fkey"
		}),
	}
});

export const sessionCredits = pgTable("session_credits", {
	id: serial("id").primaryKey().notNull(),
	userId: text("user_id").notNull(),
	adminUserId: integer("admin_user_id").notNull(),
	sessionType: varchar("session_type", { length: 50 }).notNull(),
	creditsGranted: integer("credits_granted").notNull(),
	reason: text("reason"),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	isUsed: boolean("is_used").default(false),
	usedAt: timestamp("used_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		sessionCreditsUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "session_credits_user_id_fkey"
		}).onDelete("cascade"),
		sessionCreditsAdminUserIdFkey: foreignKey({
			columns: [table.adminUserId],
			foreignColumns: [adminUsers.id],
			name: "session_credits_admin_user_id_fkey"
		}),
	}
});

export const interviewReport = pgTable("interviewReport", {
	id: serial("id").primaryKey().notNull(),
	mockId: varchar("mockId").notNull(),
	userId: text("userId").notNull(),
	overallScore: integer("overallScore"),
	strengths: text("strengths"),
	weaknesses: text("weaknesses"),
	improvementPlan: text("improvementPlan"),
	createdAt: timestamp("createdAt", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		interviewReportUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "interviewReport_userId_users_id_fk"
		}).onDelete("cascade"),
		interviewReportMockIdUnique: unique("interviewReport_mockId_unique").on(table.mockId),
	}
});

export const education = pgTable("education", {
	id: serial("id").primaryKey().notNull(),
	userProfileId: integer("user_profile_id").notNull(),
	institutionName: varchar("institution_name", { length: 255 }),
	degreeType: varchar("degree_type", { length: 255 }),
	fieldOfStudy: varchar("field_of_study", { length: 255 }),
	graduationYear: varchar("graduation_year", { length: 50 }),
	gpa: varchar("gpa", { length: 10 }),
},
(table) => {
	return {
		educationUserProfileIdUserProfilesIdFk: foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "education_user_profile_id_user_profiles_id_fk"
		}).onDelete("cascade"),
	}
});

export const workHistory = pgTable("work_history", {
	id: serial("id").primaryKey().notNull(),
	userProfileId: integer("user_profile_id").notNull(),
	jobTitle: varchar("job_title", { length: 255 }),
	companyName: varchar("company_name", { length: 255 }),
	startDate: varchar("start_date", { length: 50 }),
	endDate: varchar("end_date", { length: 50 }),
	description: text("description"),
},
(table) => {
	return {
		workHistoryUserProfileIdUserProfilesIdFk: foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "work_history_user_profile_id_user_profiles_id_fk"
		}).onDelete("cascade"),
	}
});

export const userProfiles = pgTable("user_profiles", {
	id: serial("id").primaryKey().notNull(),
	email: varchar("email", { length: 255 }).notNull(),
	fullName: varchar("full_name", { length: 255 }),
	phoneNumber: varchar("phone_number", { length: 50 }),
	professionalTitle: varchar("professional_title", { length: 255 }),
	locationCity: varchar("location_city", { length: 100 }),
	locationCountry: varchar("location_country", { length: 100 }),
	yearsOfExperience: integer("years_of_experience"),
	professionalSummary: text("professional_summary"),
	skills: text("skills"),
	hobbiesInterests: text("hobbies_interests"),
},
(table) => {
	return {
		userProfilesEmailUnique: unique("user_profiles_email_unique").on(table.email),
	}
});

export const certifications = pgTable("certifications", {
	id: serial("id").primaryKey().notNull(),
	userProfileId: integer("user_profile_id").notNull(),
	name: varchar("name", { length: 255 }),
	issuingOrg: varchar("issuing_org", { length: 255 }),
	date: varchar("date", { length: 50 }),
},
(table) => {
	return {
		certificationsUserProfileIdUserProfilesIdFk: foreignKey({
			columns: [table.userProfileId],
			foreignColumns: [userProfiles.id],
			name: "certifications_user_profile_id_user_profiles_id_fk"
		}).onDelete("cascade"),
	}
});

export const adminUsers = pgTable("admin_users", {
	id: serial("id").primaryKey().notNull(),
	userId: text("user_id").notNull(),
	role: varchar("role", { length: 50 }).default('support').notNull(),
	permissions: json("permissions"),
	isActive: boolean("is_active").default(true),
	lastLogin: timestamp("last_login", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		adminUsersUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "admin_users_user_id_fkey"
		}).onDelete("cascade"),
	}
});

export const adminAuditLog = pgTable("admin_audit_log", {
	id: serial("id").primaryKey().notNull(),
	adminUserId: integer("admin_user_id").notNull(),
	action: varchar("action", { length: 100 }).notNull(),
	targetType: varchar("target_type", { length: 50 }),
	targetId: varchar("target_id", { length: 255 }),
	details: json("details"),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		adminAuditLogAdminUserIdFkey: foreignKey({
			columns: [table.adminUserId],
			foreignColumns: [adminUsers.id],
			name: "admin_audit_log_admin_user_id_fkey"
		}),
	}
});

export const jobRoles = pgTable("job_roles", {
	id: serial("id").primaryKey().notNull(),
	name: varchar("name", { length: 100 }).notNull(),
	category: varchar("category", { length: 50 }),
	description: text("description"),
	skillsRequired: json("skills_required"),
	experienceLevels: json("experience_levels"),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		jobRolesNameKey: unique("job_roles_name_key").on(table.name),
	}
});

export const questionTemplates = pgTable("question_templates", {
	id: serial("id").primaryKey().notNull(),
	jobRoleId: integer("job_role_id"),
	question: text("question").notNull(),
	category: varchar("category", { length: 50 }),
	difficulty: varchar("difficulty", { length: 20 }).default('medium'),
	expectedAnswer: text("expected_answer"),
	evaluationCriteria: json("evaluation_criteria"),
	tags: json("tags"),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		questionTemplatesJobRoleIdFkey: foreignKey({
			columns: [table.jobRoleId],
			foreignColumns: [jobRoles.id],
			name: "question_templates_job_role_id_fkey"
		}).onDelete("set null"),
	}
});

export const copilotPromptTemplates = pgTable("copilot_prompt_templates", {
	id: serial("id").primaryKey().notNull(),
	name: varchar("name", { length: 100 }).notNull(),
	description: text("description"),
	systemPrompt: text("system_prompt").notNull(),
	jobRoleId: integer("job_role_id"),
	experienceLevel: varchar("experience_level", { length: 50 }),
	isActive: boolean("is_active").default(true),
	isDefault: boolean("is_default").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		copilotPromptTemplatesJobRoleIdFkey: foreignKey({
			columns: [table.jobRoleId],
			foreignColumns: [jobRoles.id],
			name: "copilot_prompt_templates_job_role_id_fkey"
		}).onDelete("set null"),
	}
});

export const sessionDetails = pgTable("session_details", {
	id: serial("id").primaryKey().notNull(),
	sessionId: varchar("session_id", { length: 255 }).notNull(),
	userId: text("user_id").notNull(),
	sessionType: varchar("session_type", { length: 50 }).notNull(),
	jobPosition: varchar("job_position", { length: 255 }),
	jobLevel: varchar("job_level", { length: 100 }),
	industry: varchar("industry", { length: 255 }),
	transcript: text("transcript"),
	suggestions: text("suggestions"),
	status: varchar("status", { length: 50 }).default('active'),
	startedAt: timestamp("started_at", { mode: 'string' }).defaultNow(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	totalQuestions: integer("total_questions"),
	questionsAnswered: integer("questions_answered"),
	averageResponseTime: integer("average_response_time"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		sessionDetailsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "session_details_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const accounts = pgTable("accounts", {
	userId: text("userId").notNull(),
	type: text("type").notNull(),
	provider: text("provider").notNull(),
	providerAccountId: text("providerAccountId").notNull(),
	refreshToken: text("refresh_token"),
	accessToken: text("access_token"),
	expiresAt: integer("expires_at"),
	tokenType: text("token_type"),
	idToken: text("id_token"),
	sessionState: text("session_state"),
},
(table) => {
	return {
		accountsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "accounts_userId_users_id_fk"
		}).onDelete("cascade"),
		accountsProviderProviderAccountIdPk: primaryKey({ columns: [table.provider, table.providerAccountId], name: "accounts_provider_providerAccountId_pk"}),
	}
});