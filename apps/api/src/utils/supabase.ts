import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-supabase-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'your-supabase-service-role-key-here';

// Initialize Supabase Client with full privileges (service role) to write files
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
