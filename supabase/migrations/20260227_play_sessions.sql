CREATE TABLE IF NOT EXISTS play_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  user_id uuid,
  song_id text NOT NULL,
  mode text NOT NULL,
  score integer DEFAULT 0,
  total_notes integer DEFAULT 0,
  completed boolean DEFAULT false,
  tempo_used integer,
  played_at timestamptz DEFAULT now()
);

ALTER TABLE play_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_access" ON play_sessions 
  FOR ALL USING (true) WITH CHECK (true);

-- Add user_id to progress table
ALTER TABLE progress ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS progress_user_id_idx ON progress(user_id);
