-- =============================================================================
-- Migration: Auto-create profile on user signup
-- =============================================================================
-- This trigger automatically creates a profile row when a new user signs up
-- via Supabase Auth. The profile is created with default values:
-- - role: 'warrior'
-- - level: 0
-- - xp: 0
-- - oath_signed_at: NULL (user must sign the Oath to gain app access)
-- =============================================================================

-- Create the trigger function
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

-- Create the trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
