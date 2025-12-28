-- RLS Performance Optimizations
-- Addresses: auth_rls_initplan (27 warnings), multiple_permissive_policies
-- CORRECTION 2: Consolidates multiple permissive policies into single policies to fix valid warnings.
-- CORRECTION 1: Uses 'is_admin' boolean column instead of non-existent 'role' column.

-- ==============================================================================
-- 1. CHALLENGES
-- ==============================================================================

-- Consolidated SELECT policy to avoid "multiple permissive policies" warning
DROP POLICY IF EXISTS "Users can read own challenges" ON public.challenges;
DROP POLICY IF EXISTS "Users can read challenges from posts" ON public.challenges;

CREATE POLICY "Users can view challenges" ON public.challenges
  FOR SELECT
  USING (
    user_id = (select auth.uid()) 
    OR 
    id IN (SELECT challenge_id FROM public.posts)
  );

-- Other actions specific to owner
DROP POLICY IF EXISTS "Users can insert own challenges" ON public.challenges;
CREATE POLICY "Users can insert own challenges" ON public.challenges
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own challenges" ON public.challenges;
CREATE POLICY "Users can update own challenges" ON public.challenges
  FOR UPDATE
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own challenges" ON public.challenges;
CREATE POLICY "Users can delete own challenges" ON public.challenges
  FOR DELETE
  USING (user_id = (select auth.uid()));


-- ==============================================================================
-- 2. CHALLENGE_CHECKINS
-- ==============================================================================

DROP POLICY IF EXISTS "Users can read own checkins" ON public.challenge_checkins;
CREATE POLICY "Users can read own checkins" ON public.challenge_checkins
  FOR SELECT
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own checkins" ON public.challenge_checkins;
CREATE POLICY "Users can insert own checkins" ON public.challenge_checkins
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own checkins" ON public.challenge_checkins;
CREATE POLICY "Users can delete own checkins" ON public.challenge_checkins
  FOR DELETE
  USING (user_id = (select auth.uid()));


-- ==============================================================================
-- 3. MODERATION_LOGS (Admins only)
-- ==============================================================================

DROP POLICY IF EXISTS "Allow select for admins" ON public.moderation_logs;
CREATE POLICY "Allow select for admins" ON public.moderation_logs
  FOR SELECT
  USING ((SELECT is_admin FROM public.profiles WHERE id = (select auth.uid())) = true);


-- ==============================================================================
-- 4. REPORTS
-- ==============================================================================

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.reports;
CREATE POLICY "Allow insert for authenticated users" ON public.reports
  FOR INSERT
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Allow select for admins" ON public.reports;
CREATE POLICY "Allow select for admins" ON public.reports
  FOR SELECT
  USING ((SELECT is_admin FROM public.profiles WHERE id = (select auth.uid())) = true);

-- Consolidated DELETE policy
DROP POLICY IF EXISTS "Allow admins to delete reports" ON public.reports;
DROP POLICY IF EXISTS "Allow delete for admins" ON public.reports;

CREATE POLICY "Allow delete for admins" ON public.reports
  FOR DELETE
  USING ((SELECT is_admin FROM public.profiles WHERE id = (select auth.uid())) = true);


-- ==============================================================================
-- 5. AI_FLAGS
-- ==============================================================================

DROP POLICY IF EXISTS "Allow select for admins" ON public.ai_flags;
CREATE POLICY "Allow select for admins" ON public.ai_flags
  FOR SELECT
  USING ((SELECT is_admin FROM public.profiles WHERE id = (select auth.uid())) = true);

DROP POLICY IF EXISTS "Allow admins to delete ai_flags" ON public.ai_flags;
CREATE POLICY "Allow admins to delete ai_flags" ON public.ai_flags
  FOR DELETE
  USING ((SELECT is_admin FROM public.profiles WHERE id = (select auth.uid())) = true);


-- ==============================================================================
-- 6. POSTS
-- ==============================================================================

-- Consolidated DELETE policy to avoid "multiple permissive policies" warning
DROP POLICY IF EXISTS "Allow admins to delete any post" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;

CREATE POLICY "Users or Admins can delete posts" ON public.posts
  FOR DELETE
  USING (
    user_id = (select auth.uid()) 
    OR 
    (SELECT is_admin FROM public.profiles WHERE id = (select auth.uid())) = true
  );
