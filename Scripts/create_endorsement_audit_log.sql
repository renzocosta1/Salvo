-- ============================================================================
-- CREATE ENDORSEMENT AUDIT LOG TABLE
-- ============================================================================
-- Tracks all endorsement changes for accountability and undo functionality
-- ============================================================================

CREATE TABLE IF NOT EXISTS endorsement_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  candidate_id UUID REFERENCES md_ballot_candidates(id) ON DELETE CASCADE,
  race_id UUID REFERENCES md_ballot_races(id) ON DELETE CASCADE,
  previous_endorsed BOOLEAN,
  new_endorsed BOOLEAN,
  affected_geography TEXT,
  estimated_users_affected INTEGER,
  change_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_endorsement_audit_candidate 
ON endorsement_audit_log(candidate_id);

CREATE INDEX IF NOT EXISTS idx_endorsement_audit_changed_by 
ON endorsement_audit_log(changed_by_user_id);

CREATE INDEX IF NOT EXISTS idx_endorsement_audit_created_at 
ON endorsement_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_endorsement_audit_race 
ON endorsement_audit_log(race_id);

-- Row-Level Security (Leaders can see all logs, users can't see any)
ALTER TABLE endorsement_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaders can view all audit logs"
ON endorsement_audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.leadership_role IS NOT NULL
  )
);

CREATE POLICY "Leaders can insert audit logs"
ON endorsement_audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.leadership_role IS NOT NULL
  )
);

-- Verify table was created
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'endorsement_audit_log'
ORDER BY ordinal_position;

-- Verify RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'endorsement_audit_log';
