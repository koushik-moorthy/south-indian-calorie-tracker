import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export const LOG_TABLE = "log_entries";
export const SETTINGS_TABLE = "user_settings";

function getConfig(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return { url, key };
}

/**
 * Extract the Bearer access token from a request's Authorization header.
 */
export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Build a request-scoped Supabase client that acts AS the authenticated user,
 * so every query is enforced by row-level security (auth.uid() = user_id).
 * Returns null if the token is missing or invalid.
 */
export async function getUserClient(
  request: Request
): Promise<{ supabase: SupabaseClient; user: User } | null> {
  const token = getBearerToken(request);
  if (!token) return null;

  const { url, key } = getConfig();
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, user: data.user };
}
