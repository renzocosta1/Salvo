-- =============================================================================
-- Task #2: Apply Database Migration for The Gates
-- =============================================================================
-- Instructions:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Copy and paste this entire file
-- 3. Click "Run" to execute
-- =============================================================================

-- Step 1: Create the trigger function for auto-creating profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    display_name,
    role,
    level,
    xp
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    'warrior',
    0,
    0
  );
  RETURN NEW;
END;
$$;

-- Step 2: Create the trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Step 4: Ensure Hard Party exists
INSERT INTO parties (name, general_user_id)
VALUES ('Hard Party', NULL)
ON CONFLICT (name) DO NOTHING;

-- Step 5: Verify setup
SELECT 'Migration applied successfully!' AS status;

-- Quick verification queries:
SELECT 'Parties:' as check_type, COUNT(*) as count FROM parties;
SELECT 'Contract Versions:' as check_type, COUNT(*) as count FROM contract_versions;
SELECT 'Ranks:' as check_type, COUNT(*) as count FROM ranks;
