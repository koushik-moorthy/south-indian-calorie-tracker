"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Singleton Supabase client for the browser. Used ONLY for auth
 * (signup / login / session / signout). All data access goes through our
 * server API routes, authenticated with the session's access token.
 */
let client: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}

/** Current session access token, or null if signed out. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await getBrowserSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}
