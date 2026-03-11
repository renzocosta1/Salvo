-- =====================================================
-- Avatar Storage Bucket Setup
-- =====================================================
-- Creates Supabase storage bucket for profile pictures
-- =====================================================

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own avatars
-- Filename pattern: {user_id}_avatar_{timestamp}.{ext}
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    name LIKE (auth.uid()::text || '_avatar_%')
  );

-- Allow authenticated users to update their own avatars
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    name LIKE (auth.uid()::text || '_avatar_%')
  );

-- Allow authenticated users to delete their own avatars
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    name LIKE (auth.uid()::text || '_avatar_%')
  );

-- Allow public read access to all avatars
CREATE POLICY "Public read access to avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

DO $$
BEGIN
  RAISE NOTICE '✅ Avatar storage bucket configured!';
  RAISE NOTICE '📸 Users can now upload profile pictures';
  RAISE NOTICE '🔒 Each user can only manage their own avatars';
  RAISE NOTICE '🌐 All avatars are publicly readable';
END $$;
