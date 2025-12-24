-- RLS Policy Performance Optimization
-- Fixes: auth.uid() should be wrapped in (select auth.uid()) for optimal query performance
-- Fixes: Remove duplicate policies on comments and follows tables

-- ===========================================
-- FOLLOWS TABLE - Fix auth function performance
-- ===========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own follows" ON follows;
DROP POLICY IF EXISTS "Users can delete their own follows" ON follows;
DROP POLICY IF EXISTS "Target can update follow status" ON follows;
DROP POLICY IF EXISTS "Users can reject follow requests" ON follows;
DROP POLICY IF EXISTS "Users can follow others" ON follows;
DROP POLICY IF EXISTS "Users can unfollow" ON follows;

-- Recreate with optimized auth function (wrapped in select)
CREATE POLICY "Users can insert follows" ON follows
    FOR INSERT TO authenticated
    WITH CHECK (follower_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete follows" ON follows
    FOR DELETE TO authenticated
    USING (follower_id = (SELECT auth.uid()) OR following_id = (SELECT auth.uid()));

CREATE POLICY "Target can update follow status" ON follows
    FOR UPDATE TO authenticated
    USING (following_id = (SELECT auth.uid()))
    WITH CHECK (following_id = (SELECT auth.uid()));

-- ===========================================
-- LIKES TABLE - Fix auth function performance
-- ===========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own likes" ON likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON likes;

-- Recreate with optimized auth function
CREATE POLICY "Users can insert likes" ON likes
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete likes" ON likes
    FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- ===========================================
-- NOTIFICATIONS TABLE - Fix auth function performance
-- ===========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- Recreate with optimized auth function
CREATE POLICY "Users can delete notifications" ON notifications
    FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- ===========================================
-- CONVERSATIONS TABLE - Fix auth function performance
-- ===========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert conversations" ON conversations;

-- Recreate with optimized auth function
CREATE POLICY "Users can insert conversations" ON conversations
    FOR INSERT TO authenticated
    WITH CHECK (user1_id = (SELECT auth.uid()) OR user2_id = (SELECT auth.uid()));

-- ===========================================
-- MESSAGES TABLE - Fix auth function performance
-- ===========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON messages;

-- Recreate with optimized auth function
CREATE POLICY "Users can insert messages" ON messages
    FOR INSERT TO authenticated
    WITH CHECK (sender_id = (SELECT auth.uid()));

-- ===========================================
-- COMMENTS TABLE - Fix duplicate policies
-- ===========================================

-- Drop duplicate policies
DROP POLICY IF EXISTS "Users can insert comments" ON comments;
DROP POLICY IF EXISTS "Users can insert their own comments" ON comments;

-- Single optimized policy
CREATE POLICY "Users can insert comments" ON comments
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));
