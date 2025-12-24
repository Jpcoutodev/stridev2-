DROP POLICY IF EXISTS "Users can insert their own follows" ON follows;
DROP POLICY IF EXISTS "Users can delete their own follows" ON follows;
DROP POLICY IF EXISTS "Target can update follow status" ON follows;
DROP POLICY IF EXISTS "Users can reject follow requests" ON follows;
DROP POLICY IF EXISTS "Users can follow others" ON follows;
DROP POLICY IF EXISTS "Users can unfollow" ON follows;
DROP POLICY IF EXISTS "Users can insert follows" ON follows;
DROP POLICY IF EXISTS "Users can delete follows" ON follows;

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

DROP POLICY IF EXISTS "Users can insert their own likes" ON likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON likes;
DROP POLICY IF EXISTS "Users can insert likes" ON likes;
DROP POLICY IF EXISTS "Users can delete likes" ON likes;

CREATE POLICY "Users can insert likes" ON likes
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete likes" ON likes
    FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete notifications" ON notifications;

CREATE POLICY "Users can delete notifications" ON notifications
    FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON conversations;

CREATE POLICY "Users can insert conversations" ON conversations
    FOR INSERT TO authenticated
    WITH CHECK (participant1_id = (SELECT auth.uid()) OR participant2_id = (SELECT auth.uid()));

CREATE POLICY "Users can view their own conversations" ON conversations
    FOR SELECT TO authenticated
    USING (participant1_id = (SELECT auth.uid()) OR participant2_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own conversations" ON conversations
    FOR DELETE TO authenticated
    USING (participant1_id = (SELECT auth.uid()) OR participant2_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Users can update messages" ON messages;

CREATE POLICY "Users can insert messages" ON messages
    FOR INSERT TO authenticated
    WITH CHECK (sender_id = (SELECT auth.uid()));

CREATE POLICY "Users can view messages" ON messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE id = messages.conversation_id
            AND (participant1_id = (SELECT auth.uid()) OR participant2_id = (SELECT auth.uid()))
        )
    );

CREATE POLICY "Users can update messages" ON messages
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE id = messages.conversation_id
            AND (participant1_id = (SELECT auth.uid()) OR participant2_id = (SELECT auth.uid()))
        )
    );

DROP POLICY IF EXISTS "Users can insert comments" ON comments;
DROP POLICY IF EXISTS "Users can insert their own comments" ON comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;

CREATE POLICY "Users can insert comments" ON comments
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own comments" ON comments
    FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));
