CREATE TABLE IF NOT EXISTS "certifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_profile_id" integer NOT NULL,
	"name" varchar(255),
	"issuing_org" varchar(255),
	"date" varchar(50)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "education" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_profile_id" integer NOT NULL,
	"institution_name" varchar(255),
	"degree_type" varchar(255),
	"field_of_study" varchar(255),
	"graduation_year" varchar(50),
	"gpa" varchar(10)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "interviewReport" (
	"id" serial PRIMARY KEY NOT NULL,
	"mockId" varchar NOT NULL,
	"userId" text NOT NULL,
	"overallScore" integer,
	"strengths" text,
	"weaknesses" text,
	"improvementPlan" text,
	"createdAt" timestamp DEFAULT now(),
	CONSTRAINT "interviewReport_mockId_unique" UNIQUE("mockId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"full_name" varchar(255),
	"phone_number" varchar(50),
	"professional_title" varchar(255),
	"location_city" varchar(100),
	"location_country" varchar(100),
	"years_of_experience" integer,
	"professional_summary" text,
	"skills" text,
	CONSTRAINT "user_profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_profile_id" integer NOT NULL,
	"job_title" varchar(255),
	"company_name" varchar(255),
	"start_date" varchar(50),
	"end_date" varchar(50),
	"description" text
);
--> statement-breakpoint
ALTER TABLE "mockInterview" ALTER COLUMN "duration" SET DEFAULT 15;--> statement-breakpoint
ALTER TABLE "userAnswer" ADD COLUMN "clarityScore" integer;--> statement-breakpoint
ALTER TABLE "userAnswer" ADD COLUMN "paceScore" integer;--> statement-breakpoint
ALTER TABLE "userAnswer" ADD COLUMN "fillerWords" integer;--> statement-breakpoint
ALTER TABLE "userAnswer" ADD COLUMN "confidenceScore" integer;--> statement-breakpoint
ALTER TABLE "userAnswer" ADD COLUMN "technicalScore" integer;--> statement-breakpoint
ALTER TABLE "userAnswer" ADD COLUMN "grammarScore" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "certifications" ADD CONSTRAINT "certifications_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "education" ADD CONSTRAINT "education_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "interviewReport" ADD CONSTRAINT "interviewReport_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_history" ADD CONSTRAINT "work_history_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
