import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client for server-side use (Cloud Functions).
 * Uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from process.env.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const url = process.env['SUPABASE_URL'];
    const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
    if (!url || !key) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set'
      );
    }
    client = createClient(url, key);
  }
  return client;
}
