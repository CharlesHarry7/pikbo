/**
 * Server-only Supabase clients (service role for admin; anon for user-scoped).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  isSupabaseConfigured,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/env";

let anonClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

export function getSupabaseAnonServer(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (anonClient) return anonClient;
  const url = supabaseUrl()!;
  const key = supabaseAnonKey()!;
  anonClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return anonClient;
}

/** Bypasses RLS — server routes only. Never import from client components. */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  const service = supabaseServiceRoleKey();
  if (!service) return null;
  if (adminClient) return adminClient;
  const url = supabaseUrl()!;
  adminClient = createClient(url, service, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return adminClient;
}

export async function probeSupabase(): Promise<{
  configured: boolean;
  reachable: boolean;
  hasServiceRole: boolean;
  error?: string;
}> {
  const configured = isSupabaseConfigured();
  const hasServiceRole = Boolean(supabaseServiceRoleKey());
  if (!configured) {
    return { configured: false, reachable: false, hasServiceRole };
  }
  const PROBE_MS = 3_000;
  try {
    const client = getSupabaseAnonServer();
    if (!client) {
      return {
        configured: true,
        reachable: false,
        hasServiceRole,
        error: "client_init_failed",
      };
    }
    // Lightweight reachability with hard timeout (health must not hang)
    const sessionResult = await Promise.race([
      client.auth.getSession(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("supabase_probe_timeout")), PROBE_MS)
      ),
    ]);
    const { error } = sessionResult;
    // getSession with no cookie is fine; network/config errors surface here
    if (error && /fetch|network|ENOTFOUND|ECONNREFUSED/i.test(error.message)) {
      return {
        configured: true,
        reachable: false,
        hasServiceRole,
        error: error.message.slice(0, 120),
      };
    }
    return { configured: true, reachable: true, hasServiceRole };
  } catch (e) {
    return {
      configured: true,
      reachable: false,
      hasServiceRole,
      error: e instanceof Error ? e.message.slice(0, 120) : "unknown",
    };
  }
}
