CREATE TABLE IF NOT EXISTS progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  song_id text NOT NULL,
  mode text NOT NULL,
  score integer DEFAULT 0,
  completed boolean DEFAULT false,
  tempo_used integer,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(session_id, song_id, mode)
);

ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_access" ON progress 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
