-- Migration to ensure sessionDetails table is properly set up for comprehensive session tracking

-- Add any missing columns to sessionDetails table
DO $$ 
BEGIN
  -- Check if columns exist and add them if they don't
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_details' AND column_name = 'job_level') THEN
    ALTER TABLE session_details ADD COLUMN job_level varchar(100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_details' AND column_name = 'average_response_time') THEN
    ALTER TABLE session_details ADD COLUMN average_response_time integer;
  END IF;
  
  -- Ensure proper indexes for performance
  CREATE INDEX IF NOT EXISTS idx_session_details_status ON session_details(status);
  CREATE INDEX IF NOT EXISTS idx_session_details_session_type ON session_details(session_type);
  CREATE INDEX IF NOT EXISTS idx_session_details_user_id ON session_details(user_id);
  CREATE INDEX IF NOT EXISTS idx_session_details_started_at ON session_details(started_at);
  
END $$;
