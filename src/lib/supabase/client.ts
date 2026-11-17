"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client for Realtime Broadcast.
 *
 * Uses the NEXT_PUBLIC_ env vars (safe to expose to the browser).
 * The anon key only allows access to public resources and Realtime
 * channels — it cannot access the database directly unless RLS policies
 * allow it.
 *
 * If the env vars are not set (local dev without Supabase), this returns
 * null and the tracking hook falls back to simulated driver positions.
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") return null;

  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Supabase not configured — tracking hook will use simulation
    return null;
  }

  client = createClient(url, anonKey, {
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  });

  return client;
}

/** Check if Supabase Realtime is configured. */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
