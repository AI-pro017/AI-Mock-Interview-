CREATE TABLE IF NOT EXISTS "session_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"user_id" text NOT NULL,
	"session_type" varchar(50) NOT NULL,
	"job_position" varchar(255),
	"job_level" varchar(100),
	"industry" varchar(255),
	"transcript" text,
	"suggestions" text,
	"status" varchar(50) DEFAULT 'active',
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"total_questions" integer,
	"questions_answered" integer,
	"average_response_time" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

DO $$ BEGIN
 ALTER TABLE "session_details" ADD CONSTRAINT "session_details_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$; 