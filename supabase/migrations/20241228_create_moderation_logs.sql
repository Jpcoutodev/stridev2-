-- Add is_admin column to profiles if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create moderation_logs table
CREATE TABLE IF NOT EXISTS moderation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    content_type TEXT NOT NULL, -- 'text' or 'image'
    flagged_categories JSONB,
    content_snippet TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow Insert for Authenticated Users (so the API/Client can log)
-- Note: Ideally this would be service-role only, but for this setup we allow insert from authenticated roles
CREATE POLICY "Allow insert for all users" ON moderation_logs
    FOR INSERT WITH CHECK (true);

-- Policy: Allow Select ONLY for Admins
CREATE POLICY "Allow select for admins" ON moderation_logs
    FOR SELECT USING (
        (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
    );

-- Set Specific Admin
UPDATE profiles SET is_admin = TRUE WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'coutodev7@gmail.com'
);
