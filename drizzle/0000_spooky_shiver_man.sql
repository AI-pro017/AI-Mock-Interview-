CREATE TABLE IF NOT EXISTS "mockInterview" (
	"id" serial PRIMARY KEY NOT NULL,
	"jsonMockResp" varchar(255) NOT NULL,
	"jobPosition" varchar(255) NOT NULL,
	"jobDesc" text NOT NULL,
	"jobExperience" varchar(255) NOT NULL,
	"industry" varchar(255),
	"skills" text,
	"difficulty" varchar(50) DEFAULT 'Medium',
	"focus" varchar(50) DEFAULT 'Balanced',
	"duration" integer DEFAULT 30,
	"interviewStyle" varchar(50) DEFAULT 'Conversational',
	"interviewMode" varchar(50) DEFAULT 'Practice',
	"questionCategories" text,
	"createdBy" varchar(255) NOT NULL,
	"createdAt" varchar(255),
	CONSTRAINT "mockInterview_jsonMockResp_unique" UNIQUE("jsonMockResp")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "personalityFeedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"userEmail" varchar,
	"createdAt" varchar,
	"index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userAnswer" (
	"id" serial PRIMARY KEY NOT NULL,
	"question" varchar NOT NULL,
	"correctAns" text,
	"userAns" text,
	"feedback" text,
	"rating" varchar,
	"userEmail" varchar,
	"createdAt" varchar,
	"mockId" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"emailVerified" timestamp,
	"image" text,
	"passwordHash" varchar,
	"resetToken" varchar,
	"resetTokenExpiry" timestamp,
	"experienceLevel" varchar,
	"targetRoles" text,
	"resumeUrl" varchar,
	"timezone" varchar,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verificationToken" (
	"identifier" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
