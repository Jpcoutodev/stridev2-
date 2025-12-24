-- Performance indexes for social network scalability
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- Posts indexes (faster feed loading)
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC);

-- Follows indexes (faster follower/following lookups)
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id, status);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id, status);

-- Notifications indexes (faster notification queries)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);

-- Messages indexes (faster message loading)
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);

-- Likes indexes (faster like/unlike operations)
CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
