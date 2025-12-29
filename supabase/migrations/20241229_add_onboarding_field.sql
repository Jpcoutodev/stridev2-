-- Add onboarding_completed field to profiles table if it doesn't exist
-- This ensures new users are redirected to onboarding by default

DO $$ 
BEGIN
    -- Add column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'onboarding_completed'
    ) THEN
        ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Ensure all existing NULL values are set to false
UPDATE profiles 
SET onboarding_completed = false 
WHERE onboarding_completed IS NULL;

-- Add NOT NULL constraint
ALTER TABLE profiles ALTER COLUMN onboarding_completed SET DEFAULT false;
ALTER TABLE profiles ALTER COLUMN onboarding_completed SET NOT NULL;
