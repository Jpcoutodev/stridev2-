-- Create storage buckets for images
-- Run this in Supabase SQL Editor or create buckets via Dashboard

-- Note: Bucket creation is typically done via Dashboard, but here are the policies

-- For 'post-images' bucket:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create bucket named 'post-images' (public)
-- 3. Add these policies:

-- Policy: Authenticated users can upload
CREATE POLICY "Authenticated users can upload images" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'post-images' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

-- Policy: Anyone can view images
CREATE POLICY "Public can view post images" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'post-images');

-- Policy: Users can delete their own images
CREATE POLICY "Users can delete own images" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

-- For 'avatars' bucket:
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

CREATE POLICY "Public can view avatars" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'avatars');

CREATE POLICY "Users can update own avatar" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

CREATE POLICY "Users can delete own avatar" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
