import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type AdminClient = SupabaseClient;

let cachedClient: AdminClient | null = null;

export function getSupabaseAdminClient(): AdminClient | null {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });

  return cachedClient;
}
