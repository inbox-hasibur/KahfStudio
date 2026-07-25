import { createClient } from '@supabase/supabase-js';

// Use this client for background jobs (Inngest) where cookies are not available.
// If you have RLS enabled, ensure the service role key is used instead of anon key for admin tasks.
export const createBackgroundClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};
