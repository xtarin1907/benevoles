-- bucket.public = true already serves objects via the public URL endpoint
-- without going through storage.objects RLS -- the SELECT policy only
-- added the ability to LIST/enumerate every file in the bucket via the
-- authenticated API, flagged by get_advisors as public_bucket_allows_listing.
DROP POLICY "manifestation_logos_public_read" ON storage.objects;
