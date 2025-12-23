import { createClient } from '@supabase/supabase-js';

// Fallback to hardcoded values if env vars are not available (for Vercel deployment)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qgbxduvipeadycxremqa.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_xAYUHPW7HhaX2WstMSZjnQ_moxVbv6e';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);