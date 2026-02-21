-- ============================================================================
-- TASK 29: Setup Mission Photo Storage Bucket
-- ============================================================================
-- Run this in Supabase SQL Editor to create the storage bucket for mission proof photos
-- ============================================================================

-- Create storage bucket for mission proof photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mission-proofs',
  'mission-proofs',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Set up RLS policies for mission-proofs bucket
-- Policy 1: Users can upload their own mission proofs
DROP POLICY IF EXISTS "Users can upload mission proofs" ON storage.objects;
CREATE POLICY "Users can upload mission proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mission-proofs'
);

-- Policy 2: Anyone can view mission proofs (public bucket)
DROP POLICY IF EXISTS "Public read access for mission proofs" ON storage.objects;
CREATE POLICY "Public read access for mission proofs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'mission-proofs');

-- Policy 3: Users can update their own mission proofs
DROP POLICY IF EXISTS "Users can update their mission proofs" ON storage.objects;
CREATE POLICY "Users can update their mission proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'mission-proofs')
WITH CHECK (bucket_id = 'mission-proofs');

-- Policy 4: Users can delete their own mission proofs
DROP POLICY IF EXISTS "Users can delete their mission proofs" ON storage.objects;
CREATE POLICY "Users can delete their mission proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'mission-proofs');

-- Verify setup
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'mission-proofs';

-- Should return 1 row showing the mission-proofs bucket configuration
