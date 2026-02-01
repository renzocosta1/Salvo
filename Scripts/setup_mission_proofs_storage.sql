-- Setup Supabase Storage bucket for mission proofs
-- Run this in Supabase SQL Editor

-- Note: Storage buckets are typically created via the Supabase Dashboard
-- Go to Storage → Create Bucket → Name: "mission-proofs" → Public: Yes

-- Once created, set up RLS policies for the bucket:

-- Policy 1: Users can upload to their own folder
CREATE POLICY "Users can upload mission proofs to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mission-proofs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Anyone can read mission proofs (for verification)
CREATE POLICY "Mission proofs are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'mission-proofs');

-- Policy 3: Users can update their own mission proofs
CREATE POLICY "Users can update their own mission proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'mission-proofs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'mission-proofs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Users can delete their own mission proofs
CREATE POLICY "Users can delete their own mission proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'mission-proofs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
